import Anthropic from '@anthropic-ai/sdk';
import type {
  ContentBlockParam,
  MessageParam,
  ToolUseBlock,
} from '@anthropic-ai/sdk/resources/messages.js';
import {
  TrainerResponseSchema,
  type Invocation,
  type LoopResult,
  type Tool,
  type TrainerResponse,
} from './types.js';
import { logError, logInvocation, logResponse, logToolCall } from './observability.js';

/**
 * Anthropic tool-use loop runner for the Trainer agent (and reusable by future
 * agents that share the same shape).
 *
 * The agent is expected to call the special `respond_to_user` tool to emit its
 * final structured TrainerResponse. We extract the LAST `respond_to_user`
 * invocation's input and validate it against `TrainerResponseSchema`.
 */

const DEFAULT_MODEL = 'claude-sonnet-4-6';
const DEFAULT_MAX_TOKENS = 8192;
const DEFAULT_MAX_ITERATIONS = 15;

const RESPOND_TO_USER = 'respond_to_user';

const client = new Anthropic();

export async function runAgentLoop(args: {
  systemPrompt: string;
  tools: Tool[];
  invocation: Invocation;
  memory: Record<string, unknown>;
  model?: string;
  maxTokens?: number;
  maxIterations?: number;
}): Promise<LoopResult> {
  const {
    systemPrompt,
    tools,
    invocation,
    memory,
    model = DEFAULT_MODEL,
    maxTokens = DEFAULT_MAX_TOKENS,
    maxIterations = DEFAULT_MAX_ITERATIONS,
  } = args;

  logInvocation(invocation);

  const ctx = { invocation, memory };
  const toolByName = new Map(tools.map((t) => [t.definition.name, t]));
  const toolParams = tools.map((t) => ({
    name: t.definition.name,
    description: t.definition.description,
    input_schema: t.definition.input_schema,
  }));

  const initialUserContent = `Invocation:\n${JSON.stringify(
    invocation,
    null,
    2,
  )}\n\nMemory:\n${JSON.stringify(memory, null, 2)}`;

  const messages: MessageParam[] = [
    { role: 'user', content: initialUserContent },
  ];

  const toolCallLog: LoopResult['tool_calls'] = [];
  // We track every respond_to_user invocation to support the "last call wins"
  // contract; many agents will only call it once but we don't enforce that.
  let lastRespondToUser: ToolUseBlock | null = null;
  let iterations = 0;

  // The loop is bounded by `maxIterations` model turns. We bump on each call
  // to messages.create — both for tool turns and the final terminating turn.
  while (true) {
    iterations += 1;
    if (iterations > maxIterations) {
      throw new Error('Trainer agent exceeded maxIterations');
    }

    const response = await client.messages.create({
      model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages,
      tools: toolParams as any,
    });

    // Capture any respond_to_user calls in this turn before deciding next step.
    const toolUseBlocks = response.content.filter(
      (b): b is ToolUseBlock => b.type === 'tool_use',
    );
    for (const block of toolUseBlocks) {
      if (block.name === RESPOND_TO_USER) {
        lastRespondToUser = block;
      }
    }

    if (response.stop_reason !== 'tool_use') {
      // Agent decided it's done. Whether it called respond_to_user or not,
      // this is the terminating turn. Break out and validate below.
      break;
    }

    // Append the assistant turn to history before issuing tool results.
    messages.push({ role: 'assistant', content: response.content });

    // Execute every tool_use block in this turn (often multiple in parallel).
    const toolResultBlocks: ContentBlockParam[] = [];
    for (const block of toolUseBlocks) {
      const tool = toolByName.get(block.name);
      const start = Date.now();

      if (!tool) {
        const errMsg = `Unknown tool: ${block.name}`;
        logError(new Error(errMsg), 'tool dispatch');
        toolResultBlocks.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: errMsg,
          is_error: true,
        });
        continue;
      }

      try {
        const output = await tool.execute(block.input as any, ctx);
        const durationMs = Date.now() - start;
        logToolCall(block.name, block.input, output, durationMs);
        toolCallLog.push({
          tool: block.name,
          input: block.input,
          output_preview: previewJson(output),
          duration_ms: durationMs,
        });
        toolResultBlocks.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: safeStringify(output),
        });
      } catch (err) {
        const durationMs = Date.now() - start;
        logError(err, `tool ${block.name}`);
        const errMessage = err instanceof Error ? err.message : String(err);
        toolCallLog.push({
          tool: block.name,
          input: block.input,
          output_preview: `[error] ${previewJson(errMessage)}`,
          duration_ms: durationMs,
        });
        toolResultBlocks.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: errMessage,
          is_error: true,
        });
      }
    }

    messages.push({ role: 'user', content: toolResultBlocks });
  }

  if (!lastRespondToUser) {
    throw new Error(
      'Trainer agent terminated without calling respond_to_user',
    );
  }

  const parsed = TrainerResponseSchema.safeParse(lastRespondToUser.input);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`respond_to_user payload failed validation:\n${issues}`);
  }

  const finalResponse: TrainerResponse = parsed.data;
  logResponse(finalResponse, iterations);

  return {
    response: finalResponse,
    iterations,
    tool_calls: toolCallLog,
  };
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function previewJson(value: unknown, max = 200): string {
  const s = safeStringify(value);
  return s.length <= max ? s : `${s.slice(0, max)}…`;
}

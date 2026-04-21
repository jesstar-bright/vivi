import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

import type { Invocation, LoopResult } from '../shared/types.js';
import { runAgentLoop } from '../shared/loop.js';
import { loadMemory } from '../shared/memory.js';
import { logError } from '../shared/observability.js';
import { allTools } from './tools/index.js';

/**
 * Crea Trainer agent orchestrator.
 *
 * Responsibilities:
 *   1. Load and prepare the system prompt (inject the live tool list).
 *   2. Load the user's persisted memory blob.
 *   3. Hand off to the shared agent loop runner with the tool registry.
 *   4. Surface the final TrainerResponse to the caller.
 *
 * This module deliberately does NOT own validation, scheduling, or memory
 * writes — those are responsibilities of the loop runner / individual tools.
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SYSTEM_PROMPT_PATH = resolve(__dirname, 'system-prompt.md');
const TOOL_LIST_PLACEHOLDER = '[tool list injected at runtime]';

let cachedSystemPromptTemplate: string | null = null;

/**
 * Read the trainer system prompt from disk, with a process-lifetime cache so
 * we don't hit the filesystem on every invocation.
 */
function loadSystemPromptTemplate(): string {
  if (cachedSystemPromptTemplate) return cachedSystemPromptTemplate;
  cachedSystemPromptTemplate = readFileSync(SYSTEM_PROMPT_PATH, 'utf-8');
  return cachedSystemPromptTemplate;
}

/**
 * Render the system prompt by replacing the tool-list placeholder with a
 * formatted listing of every tool's name + description. The Anthropic SDK
 * receives the full schemas separately via the `tools` parameter — this
 * narrative listing is just for the model's reference.
 */
function buildSystemPrompt(): string {
  const template = loadSystemPromptTemplate();

  const toolList = allTools
    .map((t) => `- ${t.definition.name}: ${t.definition.description}`)
    .join('\n');

  const block = `Tools available to you:\n${toolList}`;

  return template.replace(TOOL_LIST_PLACEHOLDER, block);
}

/**
 * Invoke the Trainer agent for a single invocation. Returns the full
 * LoopResult (response + iterations + tool_calls) so callers can introspect
 * the run — HTTP handlers pull `.response`, the eval harness uses `.tool_calls`
 * and `.iterations` for assertions.
 *
 * Throws if the loop fails to terminate, the response fails schema
 * validation, or any tool dispatch error bubbles up unhandled.
 */
export async function invokeTrainer(
  invocation: Invocation,
): Promise<LoopResult> {
  const systemPrompt = buildSystemPrompt();
  const memory = await loadMemory(invocation.user_id);

  try {
    return await runAgentLoop({
      systemPrompt,
      tools: allTools,
      invocation,
      memory,
    });
  } catch (err) {
    logError(err, 'invokeTrainer');
    throw err;
  }
}

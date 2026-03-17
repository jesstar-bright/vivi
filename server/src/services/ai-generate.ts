import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';

/**
 * Reusable AI generation utility with Zod validation and retry.
 *
 * Flow: generate → validate → if invalid, retry once with error feedback → if still invalid, throw.
 * Callers handle fallback logic (e.g. returning last week's plan).
 */

const client = new Anthropic();

interface GenerateOptions<T extends z.ZodType> {
  model?: string;
  maxTokens?: number;
  system: string;
  prompt: string;
  schema: T;
  /** Label used in logs, e.g. "WeeklyPlan" */
  label: string;
}

function stripMarkdownFences(text: string): string {
  let raw = text.trim();
  if (raw.startsWith('```')) {
    raw = raw.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
  }
  return raw;
}

export async function generateWithSchema<T extends z.ZodType>(
  options: GenerateOptions<T>,
): Promise<z.infer<T>> {
  const { model = 'claude-sonnet-4-6', maxTokens = 12000, system, prompt, schema, label } = options;

  // First attempt
  const firstResponse = await callClaude(model, maxTokens, system, prompt);
  const firstResult = tryParse(firstResponse, schema);

  if (firstResult.success) {
    return firstResult.data;
  }

  console.warn(`[${label}] First attempt failed validation:`, firstResult.error);

  // Retry with error feedback
  const retryPrompt = `${prompt}

YOUR PREVIOUS RESPONSE HAD VALIDATION ERRORS:
${firstResult.error}

Please fix these errors and return valid JSON. Remember: return ONLY the JSON, no markdown wrapping.`;

  const retryResponse = await callClaude(model, maxTokens, system, retryPrompt);
  const retryResult = tryParse(retryResponse, schema);

  if (retryResult.success) {
    return retryResult.data;
  }

  console.error(`[${label}] Retry also failed validation:`, retryResult.error);
  throw new Error(`AI generation failed validation after retry: ${retryResult.error}`);
}

async function callClaude(
  model: string,
  maxTokens: number,
  system: string,
  prompt: string,
): Promise<string> {
  const response = await client.messages.create({
    model,
    max_tokens: maxTokens,
    system,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0];
  if (text.type !== 'text') {
    throw new Error('Unexpected response type from Claude');
  }

  return stripMarkdownFences(text.text);
}

type ParseResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

function tryParse<T extends z.ZodType>(
  raw: string,
  schema: T,
): ParseResult<z.infer<T>> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    return { success: false, error: `Invalid JSON: ${(e as Error).message}` };
  }

  const result = schema.safeParse(parsed);
  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors = result.error.issues
    .map((i) => `  ${i.path.join('.')}: ${i.message}`)
    .join('\n');
  return { success: false, error: errors };
}

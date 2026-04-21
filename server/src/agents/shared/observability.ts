import type { Invocation, TrainerResponse } from './types.js';

/**
 * Lightweight observability for agent runs. Plain console output — no external
 * logger dependency. The shape of these lines is informally a contract; the
 * planned dashboard in Spec A step 8 will parse them.
 */

const TRUNCATE = 200;

function truncate(s: string, max = TRUNCATE): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max)}…`;
}

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function logInvocation(invocation: Invocation): void {
  console.log(
    `=== Trainer invocation ${invocation.invocation_id} [${invocation.invocation_type}] user=${invocation.user_id} ===`,
  );
}

export function logToolCall(
  toolName: string,
  input: unknown,
  output: unknown,
  durationMs: number,
): void {
  const inputStr = truncate(safeJson(input));
  const outputStr = truncate(safeJson(output));
  console.log(
    `→ tool: ${toolName} (${durationMs}ms) input=${inputStr} output=${outputStr}`,
  );
}

export function logResponse(response: TrainerResponse, iterations: number): void {
  const preview = truncate(response.message ?? '', 100);
  console.log(`← response (after ${iterations} iterations): ${preview}`);
}

export function logError(err: unknown, context: string): void {
  const msg = err instanceof Error ? err.message : safeJson(err);
  console.error(`!! error in ${context}: ${msg}`);
}

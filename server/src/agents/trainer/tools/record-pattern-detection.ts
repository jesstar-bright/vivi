import { saveMemoryKey } from '../../shared/memory.js';
import type { Tool } from '../../shared/types.js';
import { recordPatternDetectionDef } from '../tool-definitions.js';

type RecordPatternDetectionInput = {
  pattern_type: string;
  evidence: string;
  action?: string;
};

type StoredPattern = {
  pattern_type: string;
  evidence: string;
  detected_at: string;
  action?: string;
};

/**
 * Append a noticed pattern to the trainer-memory `pattern_detections` array.
 *
 * We mutate `ctx.memory` in place so a subsequent tool call within the same
 * loop iteration sees the freshly-written pattern (e.g., the agent records two
 * patterns then calls get_trainer_memory). Persistence is handled by
 * saveMemoryKey on the same key, which upserts the full array.
 */
export const recordPatternDetectionTool: Tool = {
  definition: recordPatternDetectionDef,
  execute: async (input: RecordPatternDetectionInput, ctx) => {
    const userId = ctx.invocation.user_id;
    const existing = ctx.memory['pattern_detections'];
    const list: StoredPattern[] = Array.isArray(existing)
      ? (existing as StoredPattern[])
      : [];

    const entry: StoredPattern = {
      pattern_type: input.pattern_type,
      evidence: input.evidence,
      detected_at: new Date().toISOString(),
      ...(input.action !== undefined ? { action: input.action } : {}),
    };

    const next = [...list, entry];
    ctx.memory['pattern_detections'] = next;
    await saveMemoryKey(userId, 'pattern_detections', next);

    return {
      recorded: true,
      total_patterns: next.length,
    };
  },
};

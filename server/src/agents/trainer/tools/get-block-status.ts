import { and, eq, desc } from 'drizzle-orm';
import { db, schema } from '../../../db/index.js';
import type { Tool } from '../../shared/types.js';
import { getBlockStatusDef } from '../tool-definitions.js';

/**
 * Fetch the user's currently active training block (if any) and compute which
 * week of the block we're in (1-indexed since `started_at`).
 *
 * Returns null when no active block exists — common during onboarding or
 * between blocks. Callers should treat null as "block proposal needed".
 */
export const getBlockStatusTool: Tool = {
  definition: getBlockStatusDef,
  execute: async (_input, ctx) => {
    const userId = ctx.invocation.user_id;
    const rows = await db
      .select()
      .from(schema.trainingBlocks)
      .where(
        and(
          eq(schema.trainingBlocks.userId, userId),
          eq(schema.trainingBlocks.status, 'active'),
        ),
      )
      .orderBy(desc(schema.trainingBlocks.startedAt))
      .limit(1);

    const block = rows[0];
    if (!block) return null;

    let currentWeekInBlock: number | null = null;
    if (block.startedAt) {
      const startMs = block.startedAt.getTime();
      const nowMs = Date.now();
      const daysSince = Math.floor((nowMs - startMs) / (1000 * 60 * 60 * 24));
      currentWeekInBlock = Math.max(1, Math.floor(daysSince / 7) + 1);
    }

    return {
      block_id: block.id,
      block_number: block.blockNumber,
      weeks: block.weeks,
      theme: block.theme,
      focus_areas: block.focusAreas,
      intent_reasoning: block.intentReasoning,
      status: block.status,
      started_at: block.startedAt,
      current_week_in_block: currentWeekInBlock,
    };
  },
};

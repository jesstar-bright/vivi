import { eq, desc } from 'drizzle-orm';
import { db, schema } from '../../../db/index.js';
import type { Tool } from '../../shared/types.js';
import { proposeTrainingBlockDef } from '../tool-definitions.js';

type ProposeTrainingBlockInput = {
  weeks: number;
  theme: string;
  focus_areas: string[];
  reasoning: string;
  schedule_days: string[];
};

/**
 * INSERT a new training block in `proposed` status. The block does NOT become
 * active until the user accepts it downstream — the iOS layer flips status to
 * `active` and stamps `started_at`.
 *
 * `block_number` auto-increments per user (max + 1). The first block for a new
 * user is number 1.
 *
 * Judgment call: `schedule_days` isn't part of the `training_blocks` schema.
 * Rather than mutating shared schema we return it on the proposal payload so
 * downstream (the Proposal in TrainerResponse) carries it forward to the iOS
 * confirmation flow. If it needs to land on the row later, add a `metadata`
 * jsonb column or extend the schema.
 */
export const proposeTrainingBlockTool: Tool = {
  definition: proposeTrainingBlockDef,
  execute: async (input: ProposeTrainingBlockInput, ctx) => {
    const userId = ctx.invocation.user_id;

    const existing = await db
      .select({ blockNumber: schema.trainingBlocks.blockNumber })
      .from(schema.trainingBlocks)
      .where(eq(schema.trainingBlocks.userId, userId))
      .orderBy(desc(schema.trainingBlocks.blockNumber))
      .limit(1);
    const nextBlockNumber = (existing[0]?.blockNumber ?? 0) + 1;

    const [inserted] = await db
      .insert(schema.trainingBlocks)
      .values({
        userId,
        blockNumber: nextBlockNumber,
        weeks: input.weeks,
        theme: input.theme,
        focusAreas: input.focus_areas,
        intentReasoning: input.reasoning,
        status: 'proposed',
      })
      .returning({ id: schema.trainingBlocks.id });

    return {
      proposal_id: inserted.id,
      block_number: nextBlockNumber,
      weeks: input.weeks,
      theme: input.theme,
      focus_areas: input.focus_areas,
      schedule_days: input.schedule_days,
      reasoning: input.reasoning,
      status: 'proposed' as const,
      requires_user_confirmation: true,
    };
  },
};

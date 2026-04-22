import { and, gte, desc, eq } from 'drizzle-orm';
import { db, schema } from '../../../db/index.js';
import type { Tool } from '../../shared/types.js';
import { getMetricsSinceDef } from '../tool-definitions.js';

type GetMetricsSinceInput = {
  since_date: string;
};

/**
 * Day-by-day Apple Health metric rows from `since_date` forward.
 * Use this when the agent needs raw daily resolution; for headline averages
 * call `get_health_baseline` instead.
 *
 * Scoped by `ctx.invocation.user_id` so parallel eval scenarios don't see
 * each other's data.
 */
export const getMetricsSinceTool: Tool = {
  definition: getMetricsSinceDef,
  execute: async (input: GetMetricsSinceInput, ctx) => {
    const rows = await db
      .select()
      .from(schema.weeklyMetrics)
      .where(
        and(
          eq(schema.weeklyMetrics.userId, ctx.invocation.user_id),
          gte(schema.weeklyMetrics.date, input.since_date),
        ),
      )
      .orderBy(desc(schema.weeklyMetrics.date));
    return rows;
  },
};

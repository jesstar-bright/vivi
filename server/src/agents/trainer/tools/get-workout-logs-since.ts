import { and, gte, desc, asc, eq } from 'drizzle-orm';
import { db, schema } from '../../../db/index.js';
import type { Tool } from '../../shared/types.js';
import { getWorkoutLogsSinceDef } from '../tool-definitions.js';

type GetWorkoutLogsSinceInput = {
  since_date: string;
};

/**
 * Logged exercise rows from `since_date` forward, ordered by date desc with id
 * asc as a tiebreaker so multiple exercises on the same day stay in execution
 * order within the day.
 *
 * Scoped by `ctx.invocation.user_id` so parallel eval scenarios don't see
 * each other's data.
 */
export const getWorkoutLogsSinceTool: Tool = {
  definition: getWorkoutLogsSinceDef,
  execute: async (input: GetWorkoutLogsSinceInput, ctx) => {
    const rows = await db
      .select()
      .from(schema.exerciseLogs)
      .where(
        and(
          eq(schema.exerciseLogs.userId, ctx.invocation.user_id),
          gte(schema.exerciseLogs.date, input.since_date),
        ),
      )
      .orderBy(desc(schema.exerciseLogs.date), asc(schema.exerciseLogs.id));
    return rows;
  },
};

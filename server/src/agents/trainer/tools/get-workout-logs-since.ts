import { gte, desc, asc } from 'drizzle-orm';
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
 */
export const getWorkoutLogsSinceTool: Tool = {
  definition: getWorkoutLogsSinceDef,
  execute: async (input: GetWorkoutLogsSinceInput) => {
    const rows = await db
      .select()
      .from(schema.exerciseLogs)
      .where(gte(schema.exerciseLogs.date, input.since_date))
      .orderBy(desc(schema.exerciseLogs.date), asc(schema.exerciseLogs.id));
    return rows;
  },
};

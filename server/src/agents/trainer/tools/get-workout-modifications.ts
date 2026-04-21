import { eq, and, gte, desc } from 'drizzle-orm';
import { db, schema } from '../../../db/index.js';
import type { Tool } from '../../shared/types.js';
import { getWorkoutModificationsDef } from '../tool-definitions.js';

type GetWorkoutModificationsInput = {
  since_date?: string;
};

/**
 * User-initiated workout modifications — swaps, weight changes, skipped
 * blocks, moved days. Pair with `get_workout_logs_since` to see prescription
 * vs. modification vs. actual execution. Scoped to the invocation's user.
 */
export const getWorkoutModificationsTool: Tool = {
  definition: getWorkoutModificationsDef,
  execute: async (input: GetWorkoutModificationsInput, ctx) => {
    const userId = ctx.invocation.user_id;
    const predicates = [eq(schema.workoutModifications.userId, userId)];
    if (input.since_date) {
      predicates.push(gte(schema.workoutModifications.date, input.since_date));
    }
    const rows = await db
      .select()
      .from(schema.workoutModifications)
      .where(predicates.length === 1 ? predicates[0] : and(...predicates))
      .orderBy(desc(schema.workoutModifications.date));
    return rows;
  },
};

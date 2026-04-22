import { desc, eq } from 'drizzle-orm';
import { db, schema } from '../../../db/index.js';
import type { Tool } from '../../shared/types.js';
import { getCheckInsDef } from '../tool-definitions.js';

type GetCheckInsInput = {
  last_n?: number;
};

/**
 * Most recent check-ins for the user, ordered newest first.
 *
 * Default of 4 covers a single 4-week block; callers can ask for more when
 * investigating multi-block patterns (e.g., repeated deload drift).
 *
 * Scoped by `ctx.invocation.user_id` so parallel eval scenarios don't see
 * each other's data.
 */
export const getCheckInsTool: Tool = {
  definition: getCheckInsDef,
  execute: async (input: GetCheckInsInput, ctx) => {
    const lastN = input?.last_n ?? 4;
    const rows = await db
      .select()
      .from(schema.checkIns)
      .where(eq(schema.checkIns.userId, ctx.invocation.user_id))
      .orderBy(desc(schema.checkIns.date))
      .limit(lastN);
    return rows;
  },
};

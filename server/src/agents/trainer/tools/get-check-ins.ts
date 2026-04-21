import { desc } from 'drizzle-orm';
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
 * Note: the check_ins table doesn't currently carry a user_id column, so the
 * scoping is implicitly global. When that column is added the .where here
 * should pick up `eq(checkIns.userId, ctx.invocation.user_id)`.
 */
export const getCheckInsTool: Tool = {
  definition: getCheckInsDef,
  execute: async (input: GetCheckInsInput) => {
    const lastN = input?.last_n ?? 4;
    const rows = await db
      .select()
      .from(schema.checkIns)
      .orderBy(desc(schema.checkIns.date))
      .limit(lastN);
    return rows;
  },
};

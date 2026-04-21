import { eq } from 'drizzle-orm';
import { db, schema } from '../../../db/index.js';
import type { Tool } from '../../shared/types.js';
import { getUserProfileDef } from '../tool-definitions.js';

/**
 * Fetch the user's profile row by id (from the invocation context).
 * Returns the row or `null` if no profile exists.
 */
export const getUserProfileTool: Tool = {
  definition: getUserProfileDef,
  execute: async (_input, ctx) => {
    const userId = ctx.invocation.user_id;
    const rows = await db
      .select()
      .from(schema.userProfiles)
      .where(eq(schema.userProfiles.id, userId))
      .limit(1);
    return rows[0] ?? null;
  },
};

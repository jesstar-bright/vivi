import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import type { AppEnv } from '../types/hono-env.js';

/**
 * Auth-introspection endpoints.
 *
 * Mounted under `/api/auth`. The auth middleware (in index.ts) has already
 * attached `user_id` to the context for per-user token requests. Static
 * API_TOKEN requests have no user attached — those are rejected here with a
 * 400 since "who am I?" only has a meaningful answer for per-user tokens.
 */
export const authRouter = new Hono<AppEnv>();

authRouter.get('/me', async (c) => {
  const userId = c.get('user_id');
  if (typeof userId !== 'number') {
    return c.json({ error: 'no user context' }, 400);
  }

  const rows = await db
    .select()
    .from(schema.userProfiles)
    .where(eq(schema.userProfiles.id, userId))
    .limit(1);

  const profile = rows[0];
  if (!profile) {
    // Token is valid but the profile row was deleted — surface as 404 so the
    // client can prompt re-auth rather than silently returning a stub.
    return c.json({ error: 'user profile not found' }, 404);
  }

  // "Profile complete" gate for the onboarding flow: a user is considered
  // onboarded once they've set their menstrual status AND their activity
  // baseline. Those two fields are the minimum the Trainer needs to
  // personalize without guessing.
  const hasProfile =
    profile.menstrualStatus !== null && profile.activityBaseline !== null;

  return c.json({
    user_id: profile.id,
    name: profile.name,
    has_profile: hasProfile,
  });
});

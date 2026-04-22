import type { MiddlewareHandler } from 'hono';
import { eq } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import type { AppEnv } from '../types/hono-env.js';

/**
 * Auth middleware — accepts two flavors of bearer token:
 *
 *  1. Static `API_TOKEN` (env var). Used by eval scripts and internal tooling.
 *     No `user_id` is attached; downstream code must take user_id from the
 *     request body. This is the legacy/system path.
 *
 *  2. Per-user tokens stored in `auth_tokens`. When matched, we attach
 *     `user_id` to the Hono context via `c.set('user_id', ...)` so downstream
 *     handlers can prefer it over the body. We also bump `last_used_at` so
 *     Jessica can audit which tokens are active.
 *
 * On either match, the request continues. On no match, we return 401.
 *
 * The `last_used_at` update is fire-and-forget — we don't block the request
 * waiting for the write, and we swallow errors so DB hiccups don't take down
 * auth.
 */
export const authMiddleware: MiddlewareHandler<AppEnv> = async (c, next) => {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Missing authorization token', code: 'UNAUTHORIZED' }, 401);
  }

  const token = authHeader.slice(7);

  // Path 1: static system token (eval scripts, internal use).
  if (process.env.API_TOKEN && token === process.env.API_TOKEN) {
    await next();
    return;
  }

  // Path 2: per-user token lookup.
  let authRow: typeof schema.authTokens.$inferSelect | undefined;
  try {
    const rows = await db
      .select()
      .from(schema.authTokens)
      .where(eq(schema.authTokens.token, token))
      .limit(1);
    authRow = rows[0];
  } catch {
    // DB error → fall through to 401 below.
  }

  if (!authRow) {
    return c.json({ error: 'Invalid authorization token', code: 'UNAUTHORIZED' }, 401);
  }

  c.set('user_id', authRow.userId);

  // Fire-and-forget last_used_at bump.
  void db
    .update(schema.authTokens)
    .set({ lastUsedAt: new Date() })
    .where(eq(schema.authTokens.id, authRow.id))
    .catch(() => {});

  await next();
};

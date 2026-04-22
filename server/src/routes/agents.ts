import { Hono } from 'hono';

import { invokeTrainer } from '../agents/trainer/index.js';
import type { Invocation } from '../agents/shared/types.js';
import type { AppEnv } from '../types/hono-env.js';

/**
 * Agent invocation endpoints.
 *
 * Mounted under `/api/agents` by `index.ts`. Auth is applied globally to
 * `/api/*` via the auth middleware in `index.ts`, so this router does not
 * register its own auth guard.
 *
 * The boundary validation here is intentionally light: the loop runner and
 * the agent's tools handle the business-rule validation (e.g., what the
 * `invocation_type` enum actually allows, what `trigger_payload` shapes mean
 * per type). We just gate the most basic shape errors at the HTTP edge.
 */
export const agentsRouter = new Hono<AppEnv>();

agentsRouter.post('/trainer/invoke', async (c) => {
  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  if (!body || typeof body !== 'object') {
    return c.json({ error: 'Invalid request body' }, 400);
  }

  // Prefer the user_id stamped on the auth context (per-user token) over
  // anything in the body — this prevents per-user tokens from impersonating
  // other users. Fall back to body.user_id when the request used the static
  // API_TOKEN path (no auth user attached).
  const ctxUserId = c.get('user_id');
  const userId =
    typeof ctxUserId === 'number' ? ctxUserId : body.user_id;

  if (!body.invocation_type || typeof userId !== 'number') {
    return c.json(
      { error: 'invocation_type and user_id are required' },
      400,
    );
  }

  const invocation: Invocation = {
    invocation_id:
      body.invocation_id ??
      `inv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    user_id: userId,
    invocation_type: body.invocation_type,
    trigger_payload: body.trigger_payload ?? {},
  };

  try {
    const result = await invokeTrainer(invocation);
    return c.json({
      invocation_id: invocation.invocation_id,
      response: result.response,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return c.json(
      {
        error: msg,
        invocation_id: invocation.invocation_id,
      },
      500,
    );
  }
});

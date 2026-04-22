/**
 * Hono Variables map for typed `c.get()` / `c.set()` access.
 *
 * `user_id` is set by the auth middleware when the request used a per-user
 * token. It's absent when the static `API_TOKEN` was used. Downstream code
 * should treat it as optional and decide what "no user attached" means in
 * context (e.g., 400 for /me, fall back to body for /agents).
 */
export type AppEnv = {
  Variables: {
    user_id?: number;
  };
};

import type { MiddlewareHandler } from 'hono';

export const authMiddleware: MiddlewareHandler = async (c, next) => {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Missing authorization token', code: 'UNAUTHORIZED' }, 401);
  }

  const token = authHeader.slice(7);
  if (token !== process.env.API_TOKEN) {
    return c.json({ error: 'Invalid authorization token', code: 'UNAUTHORIZED' }, 401);
  }

  await next();
};

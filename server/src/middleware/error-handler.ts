import type { ErrorHandler } from 'hono';

export const errorHandler: ErrorHandler = (err, c) => {
  console.error(`[${new Date().toISOString()}] Error:`, err.message);

  return c.json(
    { error: err.message || 'Internal server error', code: 'INTERNAL_ERROR' },
    500
  );
};

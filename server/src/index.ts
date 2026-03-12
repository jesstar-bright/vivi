import 'dotenv/config';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';
import { authMiddleware } from './middleware/auth.js';
import { errorHandler } from './middleware/error-handler.js';
import { computeCurrentWeek } from './utils.js';
import { checkinRouter } from './routes/checkin.js';
import { metricsRouter } from './routes/metrics.js';
import { plansRouter } from './routes/plans.js';
import { workoutsRouter } from './routes/workouts.js';
import { progressRouter } from './routes/progress.js';

const app = new Hono();

// Global error handler
app.onError(errorHandler);

// CORS — allow prototype and local dev
app.use('*', cors({ origin: '*' }));

// Public health check
app.get('/health', (c) => {
  const startDate = new Date('2026-03-09');
  const week = computeCurrentWeek(startDate);
  return c.json({ status: 'ok', week });
});

// Auth required for all /api routes
app.use('/api/*', authMiddleware);

// Placeholder — routes will be added as they're built
app.get('/api/health', (c) => {
  const startDate = new Date('2026-03-09');
  const week = computeCurrentWeek(startDate);
  return c.json({ status: 'ok', week, authenticated: true });
});

// Routes
app.route('/api/checkin', checkinRouter);
app.route('/api/metrics', metricsRouter);
app.route('/api/plan', plansRouter);
app.route('/api/workout', workoutsRouter);
app.route('/api/progress', progressRouter);

const port = parseInt(process.env.PORT || '3001');

console.log(`Crea API server starting on port ${port}`);
serve({ fetch: app.fetch, port });

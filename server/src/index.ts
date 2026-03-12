import 'dotenv/config';
import { readFileSync } from 'fs';
import { resolve } from 'path';
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

// Serve prototype at root — accessible from phone on same WiFi
app.get('/', (c) => {
  const htmlPath = resolve(process.cwd(), '../prototype/index.html');
  try {
    const html = readFileSync(htmlPath, 'utf-8');
    return c.html(html);
  } catch {
    return c.text('Prototype not found — run from the server/ directory', 404);
  }
});

const port = parseInt(process.env.PORT || '3001');

console.log(`Crea API server starting on port ${port}`);
serve({ fetch: app.fetch, port, hostname: '0.0.0.0' });

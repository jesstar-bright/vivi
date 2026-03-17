import 'dotenv/config';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { authMiddleware } from './middleware/auth.js';
import { errorHandler } from './middleware/error-handler.js';
import { computeCurrentWeek } from './utils.js';
import { db } from './db/index.js';
import * as schema from './db/schema.js';
import { checkinRouter } from './routes/checkin.js';
import { metricsRouter } from './routes/metrics.js';
import { plansRouter } from './routes/plans.js';
import { workoutsRouter } from './routes/workouts.js';
import { progressRouter } from './routes/progress.js';
import { mealsRouter } from './routes/meals.js';

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
app.route('/api/meals', mealsRouter);

// Serve React frontend build (static assets: JS, CSS, images)
app.use('/*', serveStatic({ root: '../client/dist' }));

// SPA fallback — serve index.html for client-side routes
app.get('/*', (c) => {
  const htmlPath = resolve(process.cwd(), '../client/dist/index.html');
  try {
    const html = readFileSync(htmlPath, 'utf-8');
    return c.html(html);
  } catch {
    return c.text('Frontend not built — run "npm run build" in client/', 404);
  }
});

const port = parseInt(process.env.PORT || '3001');

// Run migrations + seed on startup, then start server
async function start() {
  try {
    const { runMigrations } = await import('./db/migrate.js');
    await runMigrations();
  } catch (err) {
    console.error('Migration warning:', (err as Error).message);
  }

  // Seed user profile if DB is empty
  try {
    const [user] = await db.select().from(schema.userProfiles).limit(1);
    if (!user) {
      await db.insert(schema.userProfiles).values({
        name: 'Jessica',
        startDate: '2026-03-09',
        height: 67,
        conditions: 'PCOS, Mirena IUD',
        goalWeight: 140,
        currentWeight: 152,
        postOpDate: '2026-03-09',
        postOpCleared: false,
      });
      console.log('Seeded initial user profile.');
    }
  } catch (err) {
    console.error('Seed warning:', (err as Error).message);
  }

  console.log(`Crea API server starting on port ${port}`);
  serve({ fetch: app.fetch, port, hostname: '0.0.0.0' });
}

start();

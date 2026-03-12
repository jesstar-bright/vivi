import { Hono } from 'hono';
import { eq, desc, gte } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import { parseGarminEmail, fetchLatestGarminEmail } from '../services/garmin-parser.js';

const metricsRouter = new Hono();

// GET /api/metrics/weekly — most recent week's aggregated metrics
metricsRouter.get('/weekly', async (c) => {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const dateStr = sevenDaysAgo.toISOString().split('T')[0];

  const rows = await db
    .select()
    .from(schema.weeklyMetrics)
    .where(gte(schema.weeklyMetrics.date, dateStr))
    .orderBy(desc(schema.weeklyMetrics.date));

  if (rows.length === 0) {
    return c.json({ error: 'No metrics found for this week', code: 'NO_METRICS' }, 404);
  }

  // Compute averages
  const avg = (field: keyof typeof rows[0]) => {
    const vals = rows.map((r) => r[field] as number | null).filter((v): v is number => v !== null);
    return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  };

  return c.json({
    days: rows,
    averages: {
      rhr: avg('rhr'),
      hrv: avg('hrv'),
      sleep_score: avg('sleepScore'),
      sleep_hours: avg('sleepHours'),
      body_battery: avg('bodyBattery'),
      steps: avg('steps'),
      vigorous_minutes: avg('vigorousMinutes'),
      stress_avg: avg('stressAvg'),
    },
  });
});

// GET /api/metrics/history — last N weeks of metrics
metricsRouter.get('/history', async (c) => {
  const weeks = parseInt(c.req.query('weeks') || '12');
  const daysBack = weeks * 7;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysBack);
  const dateStr = startDate.toISOString().split('T')[0];

  const rows = await db
    .select()
    .from(schema.weeklyMetrics)
    .where(gte(schema.weeklyMetrics.date, dateStr))
    .orderBy(desc(schema.weeklyMetrics.date));

  return c.json({ metrics: rows, total: rows.length });
});

// POST /api/metrics/parse-email — parse raw email text and store
metricsRouter.post('/parse-email', async (c) => {
  const { email_content } = await c.req.json<{ email_content: string }>();

  if (!email_content) {
    return c.json({ error: 'email_content is required', code: 'MISSING_INPUT' }, 400);
  }

  const parsed = await parseGarminEmail(email_content);

  // Store daily metrics
  for (const day of parsed.daily_metrics) {
    await db
      .insert(schema.weeklyMetrics)
      .values({
        date: day.date,
        rhr: day.rhr,
        hrv: day.hrv,
        sleepScore: day.sleep_score,
        sleepHours: day.sleep_hours,
        bodyBattery: day.body_battery,
        steps: day.steps,
        vigorousMinutes: day.vigorous_minutes,
        stressAvg: day.stress_avg,
      })
      .onConflictDoNothing(); // skip if date already exists
  }

  return c.json({ success: true, parsed });
});

// POST /api/metrics/fetch-from-gmail — auto-fetch and parse from Gmail
metricsRouter.post('/fetch-from-gmail', async (c) => {
  const emailContent = await fetchLatestGarminEmail();

  if (!emailContent) {
    return c.json(
      { error: 'No recent Garmin email found. Check Gmail or input metrics manually.', code: 'NO_GARMIN_EMAIL' },
      404
    );
  }

  const parsed = await parseGarminEmail(emailContent);

  // Store daily metrics
  for (const day of parsed.daily_metrics) {
    await db
      .insert(schema.weeklyMetrics)
      .values({
        date: day.date,
        rhr: day.rhr,
        hrv: day.hrv,
        sleepScore: day.sleep_score,
        sleepHours: day.sleep_hours,
        bodyBattery: day.body_battery,
        steps: day.steps,
        vigorousMinutes: day.vigorous_minutes,
        stressAvg: day.stress_avg,
      })
      .onConflictDoNothing();
  }

  return c.json({ success: true, parsed });
});

export { metricsRouter };

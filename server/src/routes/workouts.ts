import { Hono } from 'hono';
import { eq, desc } from 'drizzle-orm';
import { db, schema } from '../db/index.js';

const workoutsRouter = new Hono();

// POST /api/workout/complete — log a completed exercise
workoutsRouter.post('/complete', async (c) => {
  const body = await c.req.json<{
    exercises: Array<{
      exercise_name: string;
      suggested_weight: string;
      actual_weight_used: string;
      sets_completed: number;
      reps_completed: string;
      weight_rating: 'good' | 'too_heavy' | 'too_light' | 'incomplete';
      notes?: string;
    }>;
  }>();

  if (!body.exercises || body.exercises.length === 0) {
    return c.json({ error: 'No exercises provided', code: 'MISSING_EXERCISES' }, 400);
  }

  const dateStr = new Date().toISOString().split('T')[0];

  const inserted = [];
  for (const ex of body.exercises) {
    const [row] = await db.insert(schema.exerciseLogs).values({
      date: dateStr,
      exerciseName: ex.exercise_name,
      suggestedWeight: ex.suggested_weight,
      actualWeightUsed: ex.actual_weight_used,
      setsCompleted: ex.sets_completed,
      repsCompleted: ex.reps_completed,
      weightRating: ex.weight_rating,
      notes: ex.notes || null,
    }).returning();
    inserted.push(row);
  }

  return c.json({ success: true, logged: inserted.length });
});

// GET /api/workout/history/:exercise — get history for a specific exercise
workoutsRouter.get('/history/:exercise', async (c) => {
  const exerciseName = decodeURIComponent(c.req.param('exercise'));

  const logs = await db
    .select()
    .from(schema.exerciseLogs)
    .where(eq(schema.exerciseLogs.exerciseName, exerciseName))
    .orderBy(desc(schema.exerciseLogs.date))
    .limit(20);

  // Compute weight trend
  const weights = logs
    .map((l: typeof logs[number]) => parseFloat(l.actualWeightUsed || '0'))
    .filter((w: number) => w > 0);

  const trend = weights.length >= 2
    ? weights[0] > weights[weights.length - 1]
      ? 'increasing'
      : weights[0] < weights[weights.length - 1]
        ? 'decreasing'
        : 'stable'
    : 'insufficient_data';

  return c.json({
    exercise: exerciseName,
    history: logs,
    trend,
    total_sessions: logs.length,
  });
});

export { workoutsRouter };

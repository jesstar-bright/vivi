import { Hono } from 'hono';
import { eq, desc } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import { computeCurrentWeek } from '../utils.js';

const workoutsRouter = new Hono();

// POST /api/workout/complete — log completed exercises (rating-only input)
workoutsRouter.post('/complete', async (c) => {
  const body = await c.req.json<{
    exercises: Array<{
      exercise_name: string;
      weight_rating: 'good' | 'too_heavy' | 'too_light' | 'incomplete';
      notes?: string;
    }>;
  }>();

  if (!body.exercises || body.exercises.length === 0) {
    return c.json({ error: 'No exercises provided', code: 'MISSING_EXERCISES' }, 400);
  }

  // Look up current plan to fill in suggested weights, sets, reps
  const [user] = await db.select().from(schema.userProfiles).limit(1);
  const weekNumber = user ? computeCurrentWeek(new Date(user.startDate)) : null;

  // Build a lookup map from the current plan's exercises
  const planExerciseMap: Record<string, { suggested_weight: string; sets: number; reps: string }> = {};
  if (weekNumber !== null) {
    const [plan] = await db
      .select()
      .from(schema.workoutPlans)
      .where(eq(schema.workoutPlans.weekNumber, weekNumber))
      .limit(1);

    if (plan?.planJson) {
      const planData = plan.planJson as {
        days?: Array<{
          exercises?: Array<{
            name: string;
            suggested_weight: string;
            sets: number;
            reps: string;
          }>;
        }>;
      };
      for (const day of planData.days || []) {
        for (const ex of day.exercises || []) {
          planExerciseMap[ex.name.toLowerCase()] = {
            suggested_weight: ex.suggested_weight,
            sets: ex.sets,
            reps: ex.reps,
          };
        }
      }
    }
  }

  const dateStr = new Date().toISOString().split('T')[0];

  const inserted = [];
  for (const ex of body.exercises) {
    const planEx = planExerciseMap[ex.exercise_name.toLowerCase()];
    const [row] = await db.insert(schema.exerciseLogs).values({
      date: dateStr,
      exerciseName: ex.exercise_name,
      suggestedWeight: planEx?.suggested_weight || null,
      actualWeightUsed: planEx?.suggested_weight || null,
      setsCompleted: planEx?.sets || null,
      repsCompleted: planEx?.reps || null,
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

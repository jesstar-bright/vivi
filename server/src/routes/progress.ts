import { Hono } from 'hono';
import { desc, InferSelectModel } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import { computeCurrentWeek } from '../utils.js';

type CheckIn = InferSelectModel<typeof schema.checkIns>;
type ExerciseLog = InferSelectModel<typeof schema.exerciseLogs>;

const progressRouter = new Hono();

// GET /api/progress/summary — overall progress snapshot
progressRouter.get('/summary', async (c) => {
  const [user] = await db.select().from(schema.userProfiles).limit(1);
  if (!user) {
    return c.json({ error: 'No user profile found', code: 'NO_USER' }, 500);
  }

  const weekNumber = computeCurrentWeek(new Date(user.startDate));

  // Get all check-ins
  const checkIns: Pick<CheckIn, 'weekNumber' | 'modeDecision' | 'selfReportEnergy' | 'selfReportMotivation' | 'date'>[] = await db
    .select({
      weekNumber: schema.checkIns.weekNumber,
      modeDecision: schema.checkIns.modeDecision,
      selfReportEnergy: schema.checkIns.selfReportEnergy,
      selfReportMotivation: schema.checkIns.selfReportMotivation,
      date: schema.checkIns.date,
    })
    .from(schema.checkIns)
    .orderBy(desc(schema.checkIns.weekNumber));

  // Get recent exercise logs for workout stats
  const exerciseLogs: ExerciseLog[] = await db
    .select()
    .from(schema.exerciseLogs)
    .orderBy(desc(schema.exerciseLogs.date))
    .limit(200);

  // Count workouts by rating
  const ratingCounts: Record<string, number> = {};
  for (const log of exerciseLogs) {
    const rating = log.weightRating || 'unknown';
    ratingCounts[rating] = (ratingCounts[rating] || 0) + 1;
  }

  // Unique exercises trained
  const uniqueExercises = new Set(exerciseLogs.map((l: ExerciseLog) => l.exerciseName)).size;

  // Mode distribution
  const modeDistribution: Record<string, number> = {};
  for (const ci of checkIns) {
    modeDistribution[ci.modeDecision] = (modeDistribution[ci.modeDecision] || 0) + 1;
  }

  // Average self-report scores
  const energyScores = checkIns
    .map((ci) => ci.selfReportEnergy)
    .filter((v): v is number => v !== null);
  const motivationScores = checkIns
    .map((ci) => ci.selfReportMotivation)
    .filter((v): v is number => v !== null);

  const avgEnergy = energyScores.length > 0
    ? +(energyScores.reduce((a: number, b: number) => a + b, 0) / energyScores.length).toFixed(1)
    : null;
  const avgMotivation = motivationScores.length > 0
    ? +(motivationScores.reduce((a: number, b: number) => a + b, 0) / motivationScores.length).toFixed(1)
    : null;

  return c.json({
    current_week: weekNumber,
    total_weeks: 12,
    check_ins_completed: checkIns.length,
    mode_distribution: modeDistribution,
    workout_stats: {
      total_exercises_logged: exerciseLogs.length,
      unique_exercises: uniqueExercises,
      weight_ratings: ratingCounts,
    },
    averages: {
      energy: avgEnergy,
      motivation: avgMotivation,
    },
  });
});

export { progressRouter };

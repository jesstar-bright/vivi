import { Hono } from 'hono';
import { desc, InferSelectModel } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import { computeCurrentWeek } from '../utils.js';

type WorkoutPlan = InferSelectModel<typeof schema.workoutPlans>;

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

// GET /api/progress/narrative — most recent week's AI progress narrative
progressRouter.get('/narrative', async (c) => {
  const [plan]: Pick<WorkoutPlan, 'weekNumber' | 'mode' | 'progressNarrative' | 'generatedAt'>[] = await db
    .select({
      weekNumber: schema.workoutPlans.weekNumber,
      mode: schema.workoutPlans.mode,
      progressNarrative: schema.workoutPlans.progressNarrative,
      generatedAt: schema.workoutPlans.generatedAt,
    })
    .from(schema.workoutPlans)
    .orderBy(desc(schema.workoutPlans.weekNumber))
    .limit(1);

  if (!plan || !plan.progressNarrative) {
    return c.json({
      narrative: null,
      message: 'No progress narrative available yet. Complete a check-in to generate your first narrative.',
    });
  }

  return c.json({
    week: plan.weekNumber,
    mode: plan.mode,
    narrative: plan.progressNarrative,
    generated_at: plan.generatedAt,
  });
});

// GET /api/progress/strength-gains — top 6 exercises with weight progression
progressRouter.get('/strength-gains', async (c) => {
  const allLogs: ExerciseLog[] = await db
    .select()
    .from(schema.exerciseLogs)
    .orderBy(desc(schema.exerciseLogs.date));

  if (allLogs.length === 0) {
    return c.json({ gains: [] });
  }

  // Group by exercise name
  const grouped: Record<string, ExerciseLog[]> = {};
  for (const log of allLogs) {
    if (!grouped[log.exerciseName]) grouped[log.exerciseName] = [];
    grouped[log.exerciseName].push(log);
  }

  // Pick top 6 by frequency
  const sorted = Object.entries(grouped)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 6);

  const gains = sorted.map(([exercise, logs]) => {
    // Current weight: most recent 'good' or 'too_light' log
    const goodLogs = logs.filter(
      (l) => l.weightRating === 'good' || l.weightRating === 'too_light'
    );
    const currentLog = goodLogs[0] || logs[0]; // fall back to most recent
    const currentWeight = currentLog.actualWeightUsed || currentLog.suggestedWeight || '0';

    // Start weight: oldest log
    const oldestLog = logs[logs.length - 1];
    const startWeight = oldestLog.actualWeightUsed || oldestLog.suggestedWeight || '0';

    // Compute numeric change if possible
    const currentNum = parseFloat(currentWeight);
    const startNum = parseFloat(startWeight);
    let change = 'N/A';
    if (!isNaN(currentNum) && !isNaN(startNum)) {
      const diff = currentNum - startNum;
      change = diff >= 0 ? `+${diff.toFixed(1)} lbs` : `${diff.toFixed(1)} lbs`;
    }

    return {
      exercise,
      current_weight: currentWeight,
      start_weight: startWeight,
      change,
      sessions: logs.length,
    };
  });

  return c.json({ gains });
});

export { progressRouter };

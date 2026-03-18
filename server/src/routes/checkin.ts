import { Hono } from 'hono';
import { eq, desc, gte } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import { uploadPhoto, getPhotoBuffer } from '../services/photo-storage.js';
import { fetchLatestGarminEmail, parseGarminEmail } from '../services/garmin-parser.js';
import { analyzeProgressPhoto } from '../services/photo-analyzer.js';
import { assessRecovery } from '../services/recovery-assessment.js';
import { generateWeeklyPlan } from '../services/plan-generator.js';
import { generateProgressNarrative } from '../services/narrative-generator.js';
import { generateWeeklyMealPlan } from '../services/meal-generator.js';
import { consultNutritionist } from '../services/gemini-nutritionist.js';
import { upsertWeeklyMealPlans } from '../services/meal-storage.js';
import { computeCurrentWeek } from '../utils.js';

const checkinRouter = new Hono();

// POST /api/checkin/photo — upload progress photo
checkinRouter.post('/photo', async (c) => {
  const body = await c.req.parseBody();
  const file = body['photo'];

  if (!file || !(file instanceof File)) {
    return c.json({ error: 'No photo file attached', code: 'MISSING_PHOTO' }, 400);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = file.name.split('.').pop() || 'jpg';
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `checkin-${dateStr}.${ext}`;

  const photoKey = await uploadPhoto(buffer, filename);

  return c.json({ success: true, photo_key: photoKey });
});

// POST /api/checkin/submit — full check-in flow
checkinRouter.post('/submit', async (c) => {
  const body = await c.req.json<{
    energy: number;
    motivation: number;
    notes: string;
    photo_key?: string;
    manual_metrics?: {
      sleep_avg: number;
      body_battery_avg: number;
      hrv_current: number;
      stress_avg: number;
    };
  }>();

  // 1. Get user profile
  const [user] = await db.select().from(schema.userProfiles).limit(1);
  if (!user) {
    return c.json({ error: 'No user profile found', code: 'NO_USER' }, 500);
  }

  // 2. Compute current week
  const weekNumber = computeCurrentWeek(new Date(user.startDate));

  // 3. Get weekly metrics
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  let metricRows = await db
    .select()
    .from(schema.weeklyMetrics)
    .where(gte(schema.weeklyMetrics.date, sevenDaysAgo.toISOString().split('T')[0]));

  // If no metrics, try Gmail fetch
  if (metricRows.length === 0) {
    const emailContent = await fetchLatestGarminEmail();
    if (emailContent) {
      const parsed = await parseGarminEmail(emailContent);
      for (const day of parsed.daily_metrics) {
        await db.insert(schema.weeklyMetrics).values({
          date: day.date,
          rhr: day.rhr,
          hrv: day.hrv,
          sleepScore: day.sleep_score,
          sleepHours: day.sleep_hours,
          bodyBattery: day.body_battery,
          steps: day.steps,
          vigorousMinutes: day.vigorous_minutes,
          stressAvg: day.stress_avg,
        }).onConflictDoNothing();
      }
      metricRows = await db
        .select()
        .from(schema.weeklyMetrics)
        .where(gte(schema.weeklyMetrics.date, sevenDaysAgo.toISOString().split('T')[0]));
    }
  }

  // If still no metrics, check for manual input
  if (metricRows.length === 0 && !body.manual_metrics) {
    return c.json({
      needs_metrics: true,
      message: 'No Garmin data found for this week. Please provide metrics manually or check that Garmin sent your weekly email.',
    }, 422);
  }

  // Compute averages from DB or manual input
  const avg = (field: keyof typeof metricRows[0]) => {
    const vals = metricRows.map((r) => r[field] as number | null).filter((v): v is number => v !== null);
    return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  };

  // Get prior week HRV for comparison
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  const priorRows = await db
    .select()
    .from(schema.weeklyMetrics)
    .where(gte(schema.weeklyMetrics.date, fourteenDaysAgo.toISOString().split('T')[0]));
  const priorHrvVals = priorRows
    .filter((r) => {
      const d = new Date(r.date);
      return d < sevenDaysAgo;
    })
    .map((r) => r.hrv)
    .filter((v): v is number => v !== null);
  const priorHrvAvg = priorHrvVals.length > 0
    ? priorHrvVals.reduce((a, b) => a + b, 0) / priorHrvVals.length
    : 0;

  const weeklyMetrics = body.manual_metrics
    ? {
        sleep_avg: body.manual_metrics.sleep_avg,
        body_battery_avg: body.manual_metrics.body_battery_avg,
        hrv_current: body.manual_metrics.hrv_current,
        hrv_prior_week: priorHrvAvg,
        stress_avg: body.manual_metrics.stress_avg,
      }
    : {
        sleep_avg: avg('sleepHours'),
        body_battery_avg: avg('bodyBattery'),
        hrv_current: avg('hrv'),
        hrv_prior_week: priorHrvAvg,
        stress_avg: avg('stressAvg'),
      };

  // 4. Photo analysis (if photo provided)
  let photoAnalysis = null;
  if (body.photo_key) {
    try {
      const currentPhoto = await getPhotoBuffer(body.photo_key);

      // Get previous check-in photo
      const prevCheckin = await db
        .select()
        .from(schema.checkIns)
        .where(eq(schema.checkIns.weekNumber, weekNumber - 1))
        .limit(1);

      let previousPhoto: Buffer | undefined;
      if (prevCheckin[0]?.photoUrl) {
        try {
          previousPhoto = await getPhotoBuffer(prevCheckin[0].photoUrl);
        } catch {
          // No previous photo available, that's fine
        }
      }

      photoAnalysis = await analyzeProgressPhoto({ currentPhoto, previousPhoto });
    } catch (err) {
      console.error('Photo analysis failed:', err);
      // Continue without photo analysis — don't block the check-in
    }
  }

  // 5. Recovery assessment
  const assessment = assessRecovery({
    weeklyMetrics,
    selfReport: { energy: body.energy, motivation: body.motivation },
    weekNumber,
    postOpCleared: user.postOpCleared ?? false,
  });

  // 6. Generate workout plan
  const focusAreas = photoAnalysis?.gap_analysis.priority_focus || [];

  // Get exercise history for weight suggestions
  const historyRows = await db
    .select()
    .from(schema.exerciseLogs)
    .orderBy(desc(schema.exerciseLogs.date))
    .limit(100);

  const exerciseHistory = historyRows.map((r) => ({
    exercise_name: r.exerciseName,
    weight: r.actualWeightUsed || r.suggestedWeight || '',
    date: r.date,
  }));

  const plan = await generateWeeklyPlan({
    mode: assessment.mode,
    weekNumber,
    focusAreas,
    exerciseHistory,
    userConditions: user.conditions || '',
    postOpCleared: user.postOpCleared ?? false,
    modeReasoning: assessment.reasoning,
  });

  // 7. Generate progress narrative (non-critical)
  let progressNarrative: string | null = null;
  try {
    // Gather all metrics for trends
    const allMetrics = await db
      .select()
      .from(schema.weeklyMetrics)
      .orderBy(schema.weeklyMetrics.date);

    const firstWeekMetrics = allMetrics.slice(0, 7);
    const lastWeekMetrics = allMetrics.slice(-7);

    const metricAvg = (rows: typeof allMetrics, field: keyof typeof allMetrics[0]) => {
      const vals = rows.map((r) => r[field] as number | null).filter((v): v is number => v !== null);
      return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    };

    // Gather strength gains (top 6 exercises by frequency)
    const allLogs = await db.select().from(schema.exerciseLogs).orderBy(desc(schema.exerciseLogs.date));
    const grouped: Record<string, typeof allLogs> = {};
    for (const log of allLogs) {
      if (!grouped[log.exerciseName]) grouped[log.exerciseName] = [];
      grouped[log.exerciseName].push(log);
    }
    const top6 = Object.entries(grouped).sort((a, b) => b[1].length - a[1].length).slice(0, 6);
    const strengthGains = top6.map(([exercise, logs]) => {
      const goodLogs = logs.filter((l) => l.weightRating === 'good' || l.weightRating === 'too_light');
      const currentLog = goodLogs[0] || logs[0];
      const oldestLog = logs[logs.length - 1];
      const currentWeight = currentLog.actualWeightUsed || currentLog.suggestedWeight || '0';
      const startWeight = oldestLog.actualWeightUsed || oldestLog.suggestedWeight || '0';
      const diff = parseFloat(currentWeight) - parseFloat(startWeight);
      const change = !isNaN(diff) ? (diff >= 0 ? `+${diff.toFixed(1)} lbs` : `${diff.toFixed(1)} lbs`) : 'N/A';
      return { exercise, current_weight: currentWeight, start_weight: startWeight, change, sessions: logs.length };
    });

    // Mode history from check-ins
    const allCheckIns = await db.select({ modeDecision: schema.checkIns.modeDecision }).from(schema.checkIns).orderBy(schema.checkIns.weekNumber);
    const modeHistory = allCheckIns.map((ci) => ci.modeDecision);

    // Energy / motivation averages
    const allCheckInsForAvg = await db.select({ selfReportEnergy: schema.checkIns.selfReportEnergy, selfReportMotivation: schema.checkIns.selfReportMotivation }).from(schema.checkIns);
    const energyVals = allCheckInsForAvg.map((ci) => ci.selfReportEnergy).filter((v): v is number => v !== null);
    const motivationVals = allCheckInsForAvg.map((ci) => ci.selfReportMotivation).filter((v): v is number => v !== null);
    const energyAvg = energyVals.length > 0 ? energyVals.reduce((a, b) => a + b, 0) / energyVals.length : null;
    const motivationAvg = motivationVals.length > 0 ? motivationVals.reduce((a, b) => a + b, 0) / motivationVals.length : null;

    progressNarrative = await generateProgressNarrative({
      weekNumber,
      mode: assessment.mode,
      currentMetrics: {
        rhr: metricAvg(lastWeekMetrics, 'rhr'),
        hrv: metricAvg(lastWeekMetrics, 'hrv'),
        sleepHours: metricAvg(lastWeekMetrics, 'sleepHours'),
        stressAvg: metricAvg(lastWeekMetrics, 'stressAvg'),
      },
      firstWeekMetrics: {
        rhr: metricAvg(firstWeekMetrics, 'rhr'),
        hrv: metricAvg(firstWeekMetrics, 'hrv'),
        sleepHours: metricAvg(firstWeekMetrics, 'sleepHours'),
        stressAvg: metricAvg(firstWeekMetrics, 'stressAvg'),
      },
      strengthGains,
      modeHistory,
      energyAvg,
      motivationAvg,
    });
  } catch (err) {
    console.error('Progress narrative generation failed (non-critical):', err);
  }

  // 8. Store check-in and plan
  const dateStr = new Date().toISOString().split('T')[0];

  await db.insert(schema.checkIns).values({
    weekNumber,
    date: dateStr,
    photoUrl: body.photo_key || null,
    photoAnalysis: photoAnalysis as any,
    selfReportEnergy: body.energy,
    selfReportMotivation: body.motivation,
    selfReportNotes: body.notes,
    modeDecision: assessment.mode,
    modeReasoning: assessment.reasoning,
    trainerMessage: plan.trainer_message,
  });

  await db.insert(schema.workoutPlans).values({
    weekNumber,
    mode: assessment.mode,
    planJson: plan as any,
    nutritionJson: plan.nutrition as any,
    focusAreas: focusAreas as any,
    progressNarrative,
  });

  // 9. Auto-generate weekly meal plan (non-blocking)
  const nutrition = plan.nutrition || {};
  const mealCalories = nutrition.calories ?? 1750;
  const mealProtein = nutrition.protein_g ?? 135;
  const mealFocus = nutrition.focus ?? 'anti-inflammatory';

  // Fire-and-forget: generate weekly meals in background
  (async () => {
    try {
      // Consult Gemini nutritionist
      let geminiGuidance;
      try {
        geminiGuidance = await consultNutritionist({
          weekPlan: {
            days: plan.days.map((d: any) => ({
              day: d.day,
              title: d.title,
              exercises: d.main?.map((e: any) => e.exercise || e.name) || [],
            })),
            nutrition: { calories: mealCalories, protein_g: mealProtein, focus: mealFocus },
            mode: assessment.mode,
          },
          weekNumber,
        });
      } catch (err) {
        console.error('Gemini consultation failed in auto-trigger, using defaults:', err);
        const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        geminiGuidance = {
          weekly_focus: `Week ${weekNumber} — ${mealFocus}`,
          day_guidance: dayNames.map((day) => ({
            day,
            workout_type: 'standard',
            calorie_adjustment: 0,
            carb_timing: 'Complex carbs with meals',
            protein_priority: `Aim for ${Math.round(mealProtein / 3)}g per meal`,
            hydration_oz: 96,
            special_notes: '',
          })),
          pcos_considerations: 'Focus on anti-inflammatory foods, blood sugar stability, and adequate fiber.',
          supplement_notes: 'Add protein powder to breakfast smoothies to hit protein targets.',
        };
      }

      // Get recipes and pantry
      const recipes = await db.select().from(schema.recipes);
      const pantry = await db.select().from(schema.userPantry);

      // Calculate Monday of current week
      const now = new Date();
      const dow = now.getDay();
      const monday = new Date(now);
      monday.setDate(now.getDate() - ((dow + 6) % 7));
      const startDate = monday.toISOString().split('T')[0];

      const weeklyPlan = await generateWeeklyMealPlan({
        calories: mealCalories,
        protein_g: mealProtein,
        focus: mealFocus,
        weekNumber,
        startDate,
        geminiGuidance,
        recipes: recipes.map((r) => ({
          name: r.name,
          source: r.source,
          category: r.category,
          ingredients: (r.ingredients as any[]) || [],
          tags: (r.tags as string[]) || [],
          macrosPerServing: r.macrosPerServing as any,
          notes: r.notes,
        })),
        pantry: pantry.map((p) => ({
          name: p.name,
          brand: p.brand,
          flavor: p.flavor,
          nutritionPerServing: p.nutritionPerServing as any,
          notes: p.notes,
        })),
      });

      // Store each day
      await upsertWeeklyMealPlans(weeklyPlan.days, {
        calories: mealCalories,
        protein_g: mealProtein,
        weekNumber,
        geminiGuidance,
      });

      console.log(`Auto-generated weekly meal plan for week ${weekNumber}`);
    } catch (err) {
      console.error('Auto meal plan generation failed (non-critical):', err);
    }
  })();

  // 10. Return results
  return c.json({
    week: weekNumber,
    mode: assessment.mode,
    reasoning: assessment.reasoning,
    trainer_message: plan.trainer_message,
    focus_areas: focusAreas,
    plan_summary: plan.days.map((d) => ({ day: d.day, title: d.title, duration: d.estimated_duration })),
  });
});

// GET /api/checkin/:week — get check-in data for a specific week
checkinRouter.get('/:week', async (c) => {
  const week = parseInt(c.req.param('week'));

  const [checkin] = await db
    .select()
    .from(schema.checkIns)
    .where(eq(schema.checkIns.weekNumber, week))
    .limit(1);

  if (!checkin) {
    return c.json({ error: 'No check-in found for this week', code: 'NOT_FOUND' }, 404);
  }

  const [plan] = await db
    .select()
    .from(schema.workoutPlans)
    .where(eq(schema.workoutPlans.weekNumber, week))
    .limit(1);

  return c.json({ checkin, plan: plan || null });
});

export { checkinRouter };

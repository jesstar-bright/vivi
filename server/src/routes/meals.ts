import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import { computeCurrentWeek } from '../utils.js';
import { generateMealPlan, generateWeeklyMealPlan } from '../services/meal-generator.js';
import { consultNutritionist } from '../services/gemini-nutritionist.js';
import { upsertWeeklyMealPlans } from '../services/meal-storage.js';

const mealsRouter = new Hono();

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// POST /api/meals/generate-week — Generate full weekly meal plan
mealsRouter.post('/generate-week', async (c) => {
  // 1. Get user profile
  const [user] = await db.select().from(schema.userProfiles).limit(1);
  if (!user) {
    return c.json({ error: 'No user profile found', code: 'NO_USER' }, 500);
  }

  const weekNumber = computeCurrentWeek(new Date(user.startDate));

  // 2. Fetch current week's workout plan
  const [weekPlan] = await db
    .select()
    .from(schema.workoutPlans)
    .where(eq(schema.workoutPlans.weekNumber, weekNumber))
    .limit(1);

  if (!weekPlan) {
    return c.json({ error: 'No workout plan found for this week. Complete a check-in first.', code: 'NO_PLAN' }, 422);
  }

  const planData = weekPlan.planJson as any;
  const nutrition = (weekPlan.nutritionJson as any) || {};
  const calories = nutrition.calories ?? 1750;
  const protein_g = nutrition.protein_g ?? 135;
  const focus = nutrition.focus ?? 'anti-inflammatory';

  // 3. Call Gemini nutritionist consultation
  let geminiGuidance;
  try {
    geminiGuidance = await consultNutritionist({
      weekPlan: {
        days: (planData.days || []).map((d: any) => ({
          day: d.day,
          title: d.title,
          exercises: d.main?.map((e: any) => e.exercise || e.name) || [],
        })),
        nutrition: { calories, protein_g, focus },
        mode: weekPlan.mode,
      },
      weekNumber,
    });
  } catch (err) {
    console.error('Gemini consultation failed, using defaults:', err);
    // Fallback: generate without Gemini guidance
    geminiGuidance = {
      weekly_focus: `Week ${weekNumber} — ${focus}`,
      day_guidance: DAY_NAMES.map((day) => ({
        day,
        workout_type: 'standard',
        calorie_adjustment: 0,
        carb_timing: 'Complex carbs with meals',
        protein_priority: `Aim for ${Math.round(protein_g / 3)}g per meal`,
        hydration_oz: 96,
        special_notes: '',
      })),
      pcos_considerations: 'Focus on anti-inflammatory foods, blood sugar stability, and adequate fiber.',
      supplement_notes: 'Add protein powder to breakfast smoothies to hit protein targets.',
    };
  }

  // 4. Query recipe library and pantry
  const recipes = await db.select().from(schema.recipes);
  const pantry = await db.select().from(schema.userPantry);

  // 5. Calculate week start date (Monday of current week)
  const now = new Date();
  const dayOfWeek = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7)); // Get Monday
  const startDate = monday.toISOString().split('T')[0];

  // 6. Generate weekly meal plan with Claude
  const weeklyPlan = await generateWeeklyMealPlan({
    calories,
    protein_g,
    focus,
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

  // 7. Store each day in mealPlans table
  await upsertWeeklyMealPlans(weeklyPlan.days, {
    calories,
    protein_g,
    weekNumber,
    geminiGuidance,
  });

  return c.json({
    week: weekNumber,
    days: weeklyPlan.days.map((day) => ({
      date: day.date,
      plan: {
        breakfast: day.breakfast,
        lunch: day.lunch,
        dinner: day.dinner,
        daily_totals: day.daily_totals,
        batch_prep_notes: day.batch_prep_notes,
      },
      calorie_target: calories,
      protein_target: protein_g,
    })),
    gemini_guidance: geminiGuidance,
    calorie_target: calories,
    protein_target: protein_g,
  });
});

// GET /api/meals/week/:weekNumber — Fetch stored weekly meal plan
mealsRouter.get('/week/:weekNumber', async (c) => {
  const weekNumber = parseInt(c.req.param('weekNumber'));

  const days = await db
    .select()
    .from(schema.mealPlans)
    .where(eq(schema.mealPlans.weekNumber, weekNumber));

  if (days.length === 0) {
    return c.json({ error: 'No meal plan found for this week', code: 'NOT_FOUND' }, 404);
  }

  // Sort by date
  days.sort((a, b) => a.date.localeCompare(b.date));

  // Get weekly context from first day (they all share it)
  const weeklyContext = days[0].weeklyContext;

  return c.json({
    week: weekNumber,
    days: days.map((d) => ({
      date: d.date,
      plan: d.planJson,
      calorie_target: d.calorieTarget,
      protein_target: d.proteinTarget,
    })),
    gemini_guidance: weeklyContext,
    calorie_target: days[0].calorieTarget,
    protein_target: days[0].proteinTarget,
  });
});

// GET /api/meals/today — get or generate today's meal plan
mealsRouter.get('/today', async (c) => {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD

  // Check cache first
  const [existing] = await db
    .select()
    .from(schema.mealPlans)
    .where(eq(schema.mealPlans.date, todayStr))
    .limit(1);

  if (existing) {
    return c.json({
      date: existing.date,
      plan: existing.planJson,
      calorie_target: existing.calorieTarget,
      protein_target: existing.proteinTarget,
      week_number: existing.weekNumber,
      cached: true,
    });
  }

  // Pull nutrition targets from current week's workout plan
  const [user] = await db.select().from(schema.userProfiles).limit(1);
  if (!user) {
    return c.json({ error: 'No user profile found', code: 'NO_USER' }, 500);
  }

  const weekNumber = computeCurrentWeek(new Date(user.startDate));

  const [weekPlan] = await db
    .select()
    .from(schema.workoutPlans)
    .where(eq(schema.workoutPlans.weekNumber, weekNumber))
    .limit(1);

  // Extract nutrition targets or use defaults
  const nutrition = (weekPlan?.nutritionJson as any) || {};
  const calories = nutrition.calories ?? 1750;
  const protein_g = nutrition.protein_g ?? 135;
  const focus = nutrition.focus ?? 'anti-inflammatory';

  const dayOfWeek = DAY_NAMES[today.getDay()];

  // Fetch yesterday's meals for continuity (batch-prep awareness)
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  const [yesterdayPlan] = await db
    .select()
    .from(schema.mealPlans)
    .where(eq(schema.mealPlans.date, yesterdayStr))
    .limit(1);

  const plan = await generateMealPlan({
    calories,
    protein_g,
    focus,
    weekNumber,
    dayOfWeek,
    yesterdayMeals: (yesterdayPlan?.planJson as any) ?? null,
  });

  // Persist so we don't regenerate today
  await db.insert(schema.mealPlans).values({
    date: todayStr,
    planJson: plan as any,
    calorieTarget: calories,
    proteinTarget: protein_g,
    weekNumber,
  });

  return c.json({
    date: todayStr,
    plan,
    calorie_target: calories,
    protein_target: protein_g,
    week_number: weekNumber,
    cached: false,
  });
});

export { mealsRouter };

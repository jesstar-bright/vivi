import { Hono } from 'hono';
import { eq, desc } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import { computeCurrentWeek } from '../utils.js';
import { generateMealPlan } from '../services/meal-generator.js';

const mealsRouter = new Hono();

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

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
  });

  return c.json({
    date: todayStr,
    plan,
    calorie_target: calories,
    protein_target: protein_g,
    cached: false,
  });
});

export { mealsRouter };

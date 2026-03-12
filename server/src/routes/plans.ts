import { Hono } from 'hono';
import { eq, desc } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import { computeCurrentWeek } from '../utils.js';
import { generateWeeklyPlan } from '../services/plan-generator.js';

const plansRouter = new Hono();

// GET /api/plan/current — get current week's plan
plansRouter.get('/current', async (c) => {
  const [user] = await db.select().from(schema.userProfiles).limit(1);
  if (!user) {
    return c.json({ error: 'No user profile found', code: 'NO_USER' }, 500);
  }

  const weekNumber = computeCurrentWeek(new Date(user.startDate));

  const [plan] = await db
    .select()
    .from(schema.workoutPlans)
    .where(eq(schema.workoutPlans.weekNumber, weekNumber))
    .limit(1);

  if (plan) {
    return c.json({ week: weekNumber, plan: plan.planJson, mode: plan.mode });
  }

  // Check for missed check-in or first week with no plan
  const [latestPlan] = await db
    .select()
    .from(schema.workoutPlans)
    .orderBy(desc(schema.workoutPlans.weekNumber))
    .limit(1);

  const latestWeek = latestPlan?.weekNumber || 0;

  // First week ever OR missed check-in — auto-generate a plan
  if (latestWeek === 0 || weekNumber > latestWeek + 1) {
    const isFirstWeek = latestWeek === 0;
    const mode = isFirstWeek ? 'rampup' : 'maintain';
    const reasoning = isFirstWeek
      ? 'Week 1 — auto-generated Ramp-Up plan. Easing back in safely.'
      : 'Auto-generated Maintain week — missed check-in. Recovery-first approach.';

    const autoPlan = await generateWeeklyPlan({
      mode,
      weekNumber,
      focusAreas: [],
      exerciseHistory: [],
      userConditions: user.conditions || '',
      postOpCleared: user.postOpCleared ?? false,
      modeReasoning: reasoning,
    });

    await db.insert(schema.workoutPlans).values({
      weekNumber,
      mode,
      planJson: autoPlan as any,
      nutritionJson: autoPlan.nutrition as any,
      focusAreas: [] as any,
    });

    return c.json({ week: weekNumber, plan: autoPlan, mode, auto_generated: true });
  }

  return c.json({ week: weekNumber, needs_checkin: true });
});

// GET /api/plan/:week — get a specific week's plan
plansRouter.get('/:week', async (c) => {
  const week = parseInt(c.req.param('week'));

  const [plan] = await db
    .select()
    .from(schema.workoutPlans)
    .where(eq(schema.workoutPlans.weekNumber, week))
    .limit(1);

  if (!plan) {
    return c.json({ error: 'No plan found for this week', code: 'NOT_FOUND' }, 404);
  }

  return c.json({ week, plan: plan.planJson, mode: plan.mode });
});

// GET /api/plan/history — all generated plans
plansRouter.get('/history', async (c) => {
  const plans = await db
    .select({
      weekNumber: schema.workoutPlans.weekNumber,
      mode: schema.workoutPlans.mode,
      focusAreas: schema.workoutPlans.focusAreas,
      generatedAt: schema.workoutPlans.generatedAt,
    })
    .from(schema.workoutPlans)
    .orderBy(desc(schema.workoutPlans.weekNumber));

  return c.json({ plans });
});

export { plansRouter };

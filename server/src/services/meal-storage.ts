import { eq } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import type { NutritionGuidance } from './gemini-nutritionist.js';

interface StoreDayPlan {
  date: string;
  breakfast: any;
  lunch: any;
  dinner: any;
  daily_totals: { calories: number; protein_g: number };
  batch_prep_notes?: string;
}

export async function upsertWeeklyMealPlans(
  days: StoreDayPlan[],
  params: {
    calories: number;
    protein_g: number;
    weekNumber: number;
    geminiGuidance: NutritionGuidance | any;
  }
) {
  for (const day of days) {
    const dayPlan = {
      breakfast: day.breakfast,
      lunch: day.lunch,
      dinner: day.dinner,
      daily_totals: day.daily_totals,
      batch_prep_notes: day.batch_prep_notes,
    };

    const [existing] = await db
      .select()
      .from(schema.mealPlans)
      .where(eq(schema.mealPlans.date, day.date))
      .limit(1);

    if (existing) {
      await db
        .update(schema.mealPlans)
        .set({
          planJson: dayPlan as any,
          calorieTarget: params.calories,
          proteinTarget: params.protein_g,
          weekNumber: params.weekNumber,
          weeklyContext: params.geminiGuidance as any,
          generatedAt: new Date(),
        })
        .where(eq(schema.mealPlans.date, day.date));
    } else {
      await db.insert(schema.mealPlans).values({
        date: day.date,
        planJson: dayPlan as any,
        calorieTarget: params.calories,
        proteinTarget: params.protein_g,
        weekNumber: params.weekNumber,
        weeklyContext: params.geminiGuidance as any,
      });
    }
  }
}

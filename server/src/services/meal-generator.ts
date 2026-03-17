import { z } from 'zod';
import { generateWithSchema } from './ai-generate.js';

const MealSchema = z.object({
  name: z.string(),
  calories: z.number(),
  protein_g: z.number(),
  prep_time: z.string(),
  ingredients: z.array(z.string()),
  quick_steps: z.string(),
});

const MealPlanSchema = z.object({
  breakfast: MealSchema,
  lunch: MealSchema,
  dinner: MealSchema,
  daily_totals: z.object({
    calories: z.number(),
    protein_g: z.number(),
  }),
});

export type MealPlan = z.infer<typeof MealPlanSchema>;

interface MealPlanInput {
  calories: number;
  protein_g: number;
  focus: string;
  weekNumber: number;
  dayOfWeek: string;
  yesterdayMeals?: MealPlan | null;
}

export async function generateMealPlan(input: MealPlanInput): Promise<MealPlan> {
  const { calories, protein_g, focus, weekNumber, dayOfWeek, yesterdayMeals } = input;

  const system = `You are a Blue Zone nutrition coach for a 32-year-old active woman with PCOS managing weight loss (target: 1750 cal, 135g protein).

CORE PRINCIPLES:
- Blue Zone longevity: whole foods, plant-forward, legumes daily, minimal processed food
- PCOS-friendly: anti-inflammatory, blood sugar stable, omega-3 rich
- VEGGIE-HEAVY: every lunch and dinner MUST include a generous portion of vegetables — roasted, sautéed, steamed, or raw. Think big colorful plates.
- Include a simple side salad with many meals: mixed greens, shredded parmesan, olive oil, fresh lemon. This is her go-to and she loves it.
- Simple recipes — most meals under 15 minutes prep
- She enjoys cooking but only has time to cook 3x/week MAX. On cook days, recipes can be 30-40 min. Other days must be meal-prep-friendly leftovers or 5-10 min assembly meals.
- Repeating meals across the week is GOOD — if a breakfast works, use it multiple days. Meal prep friendly.
- Suggest meals that batch well (e.g. "make double for tomorrow's lunch")
- Prioritize fiber, healthy fats, lean protein at every meal for satiety
- Minimize added sugars, refined grains, and seed oils

DIETARY RESTRICTIONS (NON-NEGOTIABLE):
- LACTOSE INTOLERANT: She tolerates Greek yogurt and cottage cheese (low lactose).
  NEVER use: heavy cream, milk, high-lactose cheeses (brie, ricotta), cream-based sauces (alfredo, béchamel), ice cream, or anything with significant lactose.
  OK: hard/aged cheeses (parmesan, cheddar, manchego), Greek yogurt, cottage cheese, butter in small amounts.
- NUTS + SUGAR REACTION: Combining nuts with sugar causes mouth/tongue sores.
  NEVER combine: nuts with honey, maple syrup, dried fruit, chocolate, jam, or any sweetener in the same dish.
  OK: plain nuts alone, nuts with savory ingredients (salads, pesto), nut butter with savory foods.
- No food allergies otherwise — she eats everything including anchovies (willing to try).

MEAL PATTERN:
- 3 meals only: breakfast, lunch, dinner. NO snacks.
- She has ADHD and does hyperfixation meals: she'll eat the same meals for ~2 weeks then needs a full change.
  Design meals that are WORTH repeating — satisfying enough to eat daily without getting bored fast.
  Think of each meal as a "rotation staple" not a one-off recipe.

Return ONLY valid JSON matching the requested schema. No markdown, no explanation.`;

  const prompt = `Generate a daily meal plan for ${dayOfWeek} of program week ${weekNumber}.

Nutrition targets:
- Total calories: ${calories} kcal
- Total protein: ${protein_g}g
- Focus: ${focus}

Return ONLY valid JSON matching this EXACT structure:
{
  "breakfast": { "name": "<string>", "calories": <number>, "protein_g": <number>, "prep_time": "<string>", "ingredients": ["<ingredient with quantity>", ...], "quick_steps": "<1-2 sentences>" },
  "lunch": { "name": "<string>", "calories": <number>, "protein_g": <number>, "prep_time": "<string>", "ingredients": ["<ingredient with quantity>", ...], "quick_steps": "<1-2 sentences>" },
  "dinner": { "name": "<string>", "calories": <number>, "protein_g": <number>, "prep_time": "<string>", "ingredients": ["<ingredient with quantity>", ...], "quick_steps": "<1-2 sentences>" },
  "daily_totals": { "calories": <number>, "protein_g": <number> }
}

${yesterdayMeals ? `
YESTERDAY'S MEALS (use this for continuity — if yesterday suggested "make double", use the leftover as today's lunch or repurpose it):
- Breakfast: ${yesterdayMeals.breakfast.name}
- Lunch: ${yesterdayMeals.lunch.name}
- Dinner: ${yesterdayMeals.dinner.name} (check quick_steps for batch-prep notes: "${yesterdayMeals.dinner.quick_steps}")
If yesterday's dinner said to make extra, today's lunch should USE those leftovers as a quick assembly meal.
` : ''}
Only 3 meals. NO snacks. Totals must be within 50 cal and 10g protein of targets.
Lunch and dinner must each feature at least 2 cups of vegetables. Include her favorite side salad (mixed greens, shredded parmesan, olive oil, lemon) with at least one meal.`;

  return generateWithSchema({
    system,
    prompt,
    schema: MealPlanSchema,
    label: 'MealPlan',
    maxTokens: 4000,
  });
}

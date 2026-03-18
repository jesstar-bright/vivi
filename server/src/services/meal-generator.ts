import { z } from 'zod';
import { generateWithSchema } from './ai-generate.js';
import type { NutritionGuidance } from './gemini-nutritionist.js';

const MealSchema = z.object({
  name: z.string(),
  calories: z.number(),
  protein_g: z.number(),
  prep_time: z.string(),
  ingredients: z.array(z.string()),
  quick_steps: z.string(),
  inspired_by: z.string().optional(),
  adaptations: z.string().optional(),
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

const DailyMealPlanSchema = z.object({
  day: z.string(),
  date: z.string(),
  breakfast: MealSchema,
  lunch: MealSchema,
  dinner: MealSchema,
  daily_totals: z.object({
    calories: z.number(),
    protein_g: z.number(),
  }),
  batch_prep_notes: z.string().optional(),
});

const WeeklyMealPlanSchema = z.object({
  days: z.array(DailyMealPlanSchema),
});

export type MealPlan = z.infer<typeof MealPlanSchema>;
export type WeeklyMealPlan = z.infer<typeof WeeklyMealPlanSchema>;

interface MealPlanInput {
  calories: number;
  protein_g: number;
  focus: string;
  weekNumber: number;
  dayOfWeek: string;
  yesterdayMeals?: MealPlan | null;
}

interface WeeklyMealPlanInput {
  calories: number;
  protein_g: number;
  focus: string;
  weekNumber: number;
  startDate: string; // YYYY-MM-DD of Monday
  geminiGuidance: NutritionGuidance;
  recipes: {
    name: string;
    source: string;
    category: string;
    ingredients: { name: string; quantity: string; unit: string }[];
    tags: string[];
    macrosPerServing: { calories: number; protein_g: number; carbs_g: number; fat_g: number } | null;
    notes: string | null;
  }[];
  pantry: {
    name: string;
    brand: string | null;
    flavor: string | null;
    nutritionPerServing: { calories: number; protein_g: number; carbs_g: number; fat_g: number; serving_size: string; serving_unit: string } | null;
    notes: string | null;
  }[];
}

const DIETARY_RULES = `DIETARY RESTRICTIONS (NON-NEGOTIABLE):
- LACTOSE INTOLERANT: She tolerates Greek yogurt and cottage cheese (low lactose).
  NEVER use: heavy cream, milk, high-lactose cheeses (brie, ricotta), cream-based sauces (alfredo, béchamel), ice cream, or anything with significant lactose.
  OK: hard/aged cheeses (parmesan, cheddar, manchego), Greek yogurt, cottage cheese, butter in small amounts.
- NUTS + SUGAR REACTION: Combining nuts with sugar causes mouth/tongue sores.
  NEVER combine: nuts with honey, maple syrup, dried fruit, chocolate, jam, or any sweetener in the same dish.
  OK: plain nuts alone, nuts with savory ingredients (salads, pesto), nut butter with savory foods.
- No food allergies otherwise — she eats everything including anchovies.`;

const BASE_SYSTEM = `You are an expert dietician and Blue Zone nutrition coach for a 32-year-old active woman with PCOS managing weight loss. You are THE authority — be decisive, not suggestive.

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

${DIETARY_RULES}

PROTEIN ACCURACY (CRITICAL):
- Be REALISTIC about protein counts. Do not inflate.
- 4 oz chicken breast = ~26g protein
- 4 oz salmon = ~25g protein
- 1 large egg = 6g protein
- 1 cup Greek yogurt = 17g protein
- 1 cup cooked quinoa = 8g protein
- 1 cup cooked lentils = 18g protein
- 1 can tuna (5 oz) = 30g protein
- 4 oz tofu = 10g protein
- If adding protein powder, use EXACT values from the pantry list provided.

MEAL PATTERN:
- 3 meals only: breakfast, lunch, dinner. NO snacks.
- She has ADHD and does hyperfixation meals: she'll eat the same meals for ~2 weeks then needs a full change.
  Design meals that are WORTH repeating — satisfying enough to eat daily without getting bored fast.
  Think of each meal as a "rotation staple" not a one-off recipe.

Return ONLY valid JSON matching the requested schema. No markdown, no explanation.`;

export async function generateWeeklyMealPlan(input: WeeklyMealPlanInput): Promise<WeeklyMealPlan> {
  const { calories, protein_g, focus, weekNumber, startDate, geminiGuidance, recipes, pantry } = input;

  // Build recipe library summary for the prompt
  const recipeLibrary = recipes.map((r) => {
    const macroStr = r.macrosPerServing
      ? ` (${r.macrosPerServing.calories} cal, ${r.macrosPerServing.protein_g}g protein per serving)`
      : '';
    const noteStr = r.notes ? ` [NOTE: ${r.notes}]` : '';
    return `- ${r.name} [${r.source}] — ${r.category}${macroStr} — Tags: ${r.tags.join(', ')}${noteStr}`;
  }).join('\n');

  // Build pantry summary
  const pantryList = pantry.map((p) => {
    const n = p.nutritionPerServing;
    const macroStr = n ? ` — ${n.protein_g}g protein/${n.serving_size} ${n.serving_unit}, ${n.calories} cal` : '';
    const noteStr = p.notes ? ` [${p.notes}]` : '';
    return `- ${p.brand ? `${p.brand} ` : ''}${p.name}${p.flavor ? ` (${p.flavor})` : ''}${macroStr}${noteStr}`;
  }).join('\n');

  // Build per-day Gemini guidance
  const dayGuidanceStr = geminiGuidance.day_guidance.map((d) =>
    `${d.day}: ${d.workout_type} | Cal adjust: ${d.calorie_adjustment > 0 ? '+' : ''}${d.calorie_adjustment} | ${d.carb_timing} | ${d.protein_priority} | ${d.special_notes}`
  ).join('\n');

  const system = BASE_SYSTEM + `

RECIPE LIBRARY — Use these as inspiration. You may serve them as-is, adapt them (swap ingredients, adjust portions, add protein), or create new meals in the same style. When adapting, note what you changed and why in the "adaptations" field. When using a recipe directly or as inspiration, set the "inspired_by" field to the recipe name and source.

${recipeLibrary}

PROTEIN POWDER INVENTORY:
${pantryList}

PCOS NUTRITIONIST GUIDANCE FOR THIS WEEK:
Weekly focus: ${geminiGuidance.weekly_focus}
PCOS considerations: ${geminiGuidance.pcos_considerations}
Supplement notes: ${geminiGuidance.supplement_notes}

PER-DAY GUIDANCE:
${dayGuidanceStr}`;

  // Calculate dates for each day
  const start = new Date(startDate + 'T00:00:00');
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const dates = dayNames.map((_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d.toISOString().split('T')[0];
  });

  const prompt = `Generate a complete 7-day meal plan for Week ${weekNumber}.

Base nutrition targets: ${calories} cal, ${protein_g}g protein daily. Focus: ${focus}.
Adjust each day's calories based on the per-day guidance above.

Week starts ${startDate}. Days and dates:
${dayNames.map((name, i) => `- ${name}: ${dates[i]}`).join('\n')}

BATCH-PREP CONTINUITY IS CRITICAL:
- If a dinner says "make double", the NEXT day's lunch MUST use those leftovers.
- Plan cook days (2-3 per week) vs. assembly/leftover days strategically.
- Mark batch-prep notes clearly.

For smoothie breakfasts, use the specific protein powders from the inventory with their exact macro counts.

Return ONLY valid JSON with this structure:
{
  "days": [
    {
      "day": "<day name>",
      "date": "<YYYY-MM-DD>",
      "breakfast": { "name": "<string>", "calories": <number>, "protein_g": <number>, "prep_time": "<string>", "ingredients": ["<ingredient with quantity>", ...], "quick_steps": "<1-2 sentences>", "inspired_by": "<recipe name — Source> or omit", "adaptations": "<what was changed> or omit" },
      "lunch": { ... same structure ... },
      "dinner": { ... same structure ... },
      "daily_totals": { "calories": <number>, "protein_g": <number> },
      "batch_prep_notes": "<optional: what to prep for tomorrow>"
    }
  ]
}

All 7 days. NO snacks. Totals must be within 50 cal and 10g protein of each day's adjusted target.
Lunch and dinner must each feature at least 2 cups of vegetables.`;

  return generateWithSchema({
    system,
    prompt,
    schema: WeeklyMealPlanSchema,
    label: 'WeeklyMealPlan',
    maxTokens: 16000,
  });
}

// Keep single-day generation as fallback for regeneration
export async function generateMealPlan(input: MealPlanInput): Promise<MealPlan> {
  const { calories, protein_g, focus, weekNumber, dayOfWeek, yesterdayMeals } = input;

  const system = BASE_SYSTEM;

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

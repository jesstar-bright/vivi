import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';

const DayGuidanceSchema = z.object({
  day: z.string(),
  workout_type: z.string(),
  calorie_adjustment: z.number(),
  carb_timing: z.string(),
  protein_priority: z.string(),
  hydration_oz: z.number(),
  special_notes: z.string(),
});

const NutritionGuidanceSchema = z.object({
  weekly_focus: z.string(),
  day_guidance: z.array(DayGuidanceSchema),
  pcos_considerations: z.string(),
  supplement_notes: z.string(),
});

export type NutritionGuidance = z.infer<typeof NutritionGuidanceSchema>;

interface ConsultInput {
  weekPlan: {
    days: { day: string; title: string; exercises?: string[] }[];
    nutrition: { calories: number; protein_g: number; focus: string };
    mode: string;
  };
  weekNumber: number;
}

export async function consultNutritionist(input: ConsultInput): Promise<NutritionGuidance> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_AI_API_KEY env var is required for Gemini nutritionist');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const workoutSummary = input.weekPlan.days.map((d) =>
    `${d.day}: ${d.title}${d.exercises ? ` (${d.exercises.join(', ')})` : ''}`
  ).join('\n');

  const prompt = `You are an expert PCOS nutritionist and registered dietitian. You are consulting for a 32-year-old woman with PCOS (Mirena IUD) who is actively training and managing weight loss.

PATIENT PROFILE:
- PCOS with insulin resistance concerns
- Current weight: ~152 lbs, goal: 140 lbs
- Training mode: ${input.weekPlan.mode}
- Week ${input.weekNumber} of program
- Base targets: ${input.weekPlan.nutrition.calories} cal, ${input.weekPlan.nutrition.protein_g}g protein
- Focus: ${input.weekPlan.nutrition.focus}
- Dietary: lactose intolerant (tolerates Greek yogurt, cottage cheese, aged cheese), nuts+sugar reaction

THIS WEEK'S WORKOUT PLAN:
${workoutSummary}

MENSTRUAL CYCLE CONTEXT:
This user recently regained her period (significant for PCOS). Her cycle follows a 28-day pattern starting March 23, 2026.
Adjust nutrition based on cycle phase:
- Menstrual (Days 1-5): Increase iron-rich foods (spinach, lentils, red meat). Anti-inflammatory focus. Gentle on digestion.
- Follicular (Days 6-14): Body handles carbs well — can increase complex carb intake around workouts. Energy is high.
- Ovulatory (Days 14-16): Peak metabolism. Maintain balanced macros.
- Luteal (Days 17-28): Cravings increase (progesterone). Add 50-100 cal from complex carbs to prevent binge cycles. Magnesium-rich foods help with PMS. Calcium and B6 support mood.

Provide a structured weekly nutritional guidance plan. For each day, consider the workout intensity, type, AND menstrual cycle phase to adjust nutrition.

Return ONLY valid JSON with this structure:
{
  "weekly_focus": "<overall nutrition theme for this week>",
  "day_guidance": [
    {
      "day": "<day name>",
      "workout_type": "<rest|upper body|lower body|full body|cardio|etc>",
      "calorie_adjustment": <number, e.g. +100 or -50 from base>,
      "carb_timing": "<when/how to time carbs>",
      "protein_priority": "<specific protein guidance>",
      "hydration_oz": <target oz>,
      "special_notes": "<any PCOS-specific or workout-specific notes>"
    }
  ],
  "pcos_considerations": "<weekly PCOS-specific dietary advice>",
  "supplement_notes": "<protein powder usage and supplement suggestions>"
}

Provide guidance for all 7 days. Be specific and actionable. Consider:
- Higher carbs around intense workouts for glycogen
- Anti-inflammatory foods on recovery/rest days
- Blood sugar management throughout
- Adequate protein for muscle repair (especially post-workout)
- Iron and magnesium for PCOS

Return ONLY the JSON object, no markdown.`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();

  // Extract JSON from response — handles markdown fences and preamble text
  let raw = text;
  if (raw.startsWith('```')) {
    raw = raw.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
  }

  // If still not valid JSON, try to extract the first JSON object
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON object found in Gemini response');
  }

  const parsed = JSON.parse(jsonMatch[0]);
  return NutritionGuidanceSchema.parse(parsed);
}

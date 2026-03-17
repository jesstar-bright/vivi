import { z } from 'zod';
import { loadTrainerInstructions } from '../utils.js';
import { generateWithSchema } from './ai-generate.js';

// --- Zod schema: single source of truth for the workout plan shape ---

const ExerciseSchema = z.object({
  name: z.string(),
  sets: z.number(),
  reps: z.string(),
  suggested_weight: z.string(),
  suggested_weight_reasoning: z.string(),
  rest: z.string(),
  notes: z.string(),
});

const PlanDaySchema = z.object({
  day: z.string(), // "Monday", "Tuesday", etc.
  title: z.string(),
  type: z.enum(['strength', 'vigorous', 'recovery', 'rest']),
  warmup: z.array(z.string()),
  exercises: z.array(ExerciseSchema),
  cooldown: z.array(z.string()),
  estimated_duration: z.string(),
});

const WeeklyPlanSchema = z.object({
  week_number: z.number(),
  mode: z.enum(['push', 'maintain', 'rampup']),
  date_range: z.object({ start: z.string(), end: z.string() }),
  days: z.array(PlanDaySchema).min(7).max(7),
  weekly_cardio: z.object({
    zone2_sessions: z.number(),
    zone2_duration: z.string(),
    vigorous_target: z.string(),
    notes: z.string(),
  }),
  nutrition: z.object({
    calories: z.number(),
    protein_g: z.number(),
    carb_timing: z.string(),
    hydration: z.string(),
    focus: z.string(),
  }),
  trainer_message: z.string(),
});

export type WeeklyPlan = z.infer<typeof WeeklyPlanSchema>;
export { WeeklyPlanSchema };

// --- Plan generation ---

export async function generateWeeklyPlan(params: {
  mode: 'push' | 'maintain' | 'rampup';
  weekNumber: number;
  focusAreas: string[];
  exerciseHistory: Array<{ exercise_name: string; weight: string; date: string }>;
  userConditions: string;
  postOpCleared: boolean;
  modeReasoning: string;
}): Promise<WeeklyPlan> {
  const trainerInstructions = loadTrainerInstructions();

  const startDate = new Date('2026-03-09');
  startDate.setDate(startDate.getDate() + (params.weekNumber - 1) * 7);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 6);

  const historyContext = params.exerciseHistory.length > 0
    ? `Recent exercise history (for weight suggestions and rotation):\n${params.exerciseHistory.map((e) => `- ${e.exercise_name}: ${e.weight} (${e.date})`).join('\n')}`
    : 'No prior exercise history available — suggest starting weights for a woman at ~152 lbs with moderate training experience.';

  const prompt = `Generate a complete 7-day workout plan for Week ${params.weekNumber}.

MODE: ${params.mode.toUpperCase()}
${params.mode === 'push' ? 'Higher volume (4 sets), heavier weights, compound movements, progressive overload.' : ''}
${params.mode === 'maintain' ? 'Lower volume (3 sets), moderate weights, more isolation and mobility, active recovery days.' : ''}
${params.mode === 'rampup' ? 'Reduced intensity, no heavy Valsalva, no inversions, bodyweight and light resistance. Post-op recovery.' : ''}

REASONING: ${params.modeReasoning}

FOCUS AREAS (give these muscle groups extra volume): ${params.focusAreas.length > 0 ? params.focusAreas.join(', ') : 'balanced — no specific focus from photo analysis'}

USER PROFILE:
- Female, age 30, ~152 lbs, goal 137-140 lbs
- Conditions: ${params.userConditions}
- Post-op cleared: ${params.postOpCleared ? 'Yes' : 'No — respect restrictions'}
- Schedule: Sunday = tennis (counts as vigorous cardio). Plan rest days around this.
- Available equipment: Full gym access (barbells, dumbbells, cables, machines)

${historyContext}

IMPORTANT:
- Rotate exercise variations from week to week to prevent plateaus
- Include suggested_weight AND suggested_weight_reasoning for each exercise
- Include warmup and cooldown for each day
- Include nutrition targets (1750 cal, 135g protein, anti-inflammatory focus for PCOS)
- End with a trainer_message — encouraging, direct, following the persona guidelines

Return ONLY valid JSON matching this EXACT structure (no markdown, no extra fields):
{
  "week_number": <number>,
  "mode": "<push|maintain|rampup>",
  "date_range": { "start": "YYYY-MM-DD", "end": "YYYY-MM-DD" },
  "days": [
    {
      "day": "<day name e.g. Monday>",
      "title": "<session title e.g. Upper Body>",
      "type": "<strength|vigorous|recovery|rest>",
      "warmup": ["<exercise description string>", ...],
      "exercises": [
        {
          "name": "<exercise name>",
          "sets": <number>,
          "reps": "<string e.g. 12 or 10 each>",
          "suggested_weight": "<string e.g. 70 lbs or bodyweight>",
          "suggested_weight_reasoning": "<string>",
          "rest": "<string e.g. 60s>",
          "notes": "<string>"
        }
      ],
      "cooldown": ["<cooldown activity string>", ...],
      "estimated_duration": "<string e.g. 55 min>"
    }
  ],
  "weekly_cardio": {
    "zone2_sessions": <number>,
    "zone2_duration": "<string>",
    "vigorous_target": "<string>",
    "notes": "<string>"
  },
  "nutrition": {
    "calories": <number>,
    "protein_g": <number>,
    "carb_timing": "<string>",
    "hydration": "<string>",
    "focus": "<string>"
  },
  "trainer_message": "<string>"
}

There must be EXACTLY 7 days. Each day's "warmup", "exercises", and "cooldown" MUST be FLAT arrays — no nested objects or supersets. The "day" field MUST be a day name string like "Monday", NOT a number.`;

  return generateWithSchema({
    system: trainerInstructions,
    prompt,
    schema: WeeklyPlanSchema,
    label: 'WeeklyPlan',
  });
}

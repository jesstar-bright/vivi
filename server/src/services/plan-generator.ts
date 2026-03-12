import Anthropic from '@anthropic-ai/sdk';
import { loadTrainerInstructions } from '../utils.js';

export interface WeeklyPlan {
  week_number: number;
  mode: string;
  date_range: { start: string; end: string };
  days: Array<{
    day: string;
    title: string;
    type: string;
    warmup: string[];
    exercises: Array<{
      name: string;
      sets: number;
      reps: string;
      suggested_weight: string;
      suggested_weight_reasoning: string;
      rest: string;
      notes: string;
    }>;
    cooldown: string[];
    estimated_duration: string;
  }>;
  weekly_cardio: {
    zone2_sessions: number;
    zone2_duration: string;
    vigorous_target: string;
    notes: string;
  };
  nutrition: {
    calories: number;
    protein_g: number;
    carb_timing: string;
    hydration: string;
    focus: string;
  };
  trainer_message: string;
}

export async function generateWeeklyPlan(params: {
  mode: 'push' | 'maintain' | 'rampup';
  weekNumber: number;
  focusAreas: string[];
  exerciseHistory: Array<{ exercise_name: string; weight: string; date: string }>;
  userConditions: string;
  postOpCleared: boolean;
  modeReasoning: string;
}): Promise<WeeklyPlan> {
  const client = new Anthropic();
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

Return ONLY valid JSON matching the WeeklyPlan structure. No markdown wrapping.`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 6000,
    system: trainerInstructions,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0];
  if (text.type !== 'text') {
    throw new Error('Unexpected response type from Claude');
  }

  // Strip markdown code fences if present
  let jsonStr = text.text.trim();
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }

  return JSON.parse(jsonStr) as WeeklyPlan;
}

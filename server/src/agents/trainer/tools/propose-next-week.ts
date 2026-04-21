import { db, schema } from '../../../db/index.js';
import type { Tool } from '../../shared/types.js';
import { proposeNextWeekDef } from '../tool-definitions.js';

type Session = {
  date: string;
  type: 'strength' | 'cardio' | 'recovery' | 'rest';
  exercises: Array<{
    name: string;
    sets: number;
    reps: string;
    suggested_weight: string;
    rest_seconds: number;
    notes?: string;
  }>;
};

type ProposeNextWeekInput = {
  block_id: number;
  week_number: number;
  mode: 'push' | 'maintain' | 'rampup' | 'deload';
  mode_reasoning: string;
  sessions: Session[];
  focus_areas: string[];
};

/**
 * INSERT a new weekly plan. Within an approved block the agent owns weekly
 * mode adaptation, so this writes directly without a confirmation gate.
 *
 * `block_id` and `mode_reasoning` aren't first-class columns on workout_plans;
 * we stash them inside the `plan_json` payload so they round-trip without a
 * schema change.
 */
export const proposeNextWeekTool: Tool = {
  definition: proposeNextWeekDef,
  execute: async (input: ProposeNextWeekInput) => {
    const planJson = {
      sessions: input.sessions,
      block_id: input.block_id,
      mode_reasoning: input.mode_reasoning,
    };

    const [inserted] = await db
      .insert(schema.workoutPlans)
      .values({
        weekNumber: input.week_number,
        mode: input.mode,
        planJson,
        focusAreas: input.focus_areas,
        generatedAt: new Date(),
      })
      .returning({ id: schema.workoutPlans.id });

    return {
      plan_id: inserted.id,
      week_number: input.week_number,
      mode: input.mode,
      sessions: input.sessions,
      focus_areas: input.focus_areas,
    };
  },
};

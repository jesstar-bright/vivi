import type { DayData, WorkoutType, NutritionData } from "@/data/workoutData";

export interface APIPlan {
  week: number;
  plan?: APIWeeklyPlan;
  mode?: string;
  needs_checkin?: boolean;
  auto_generated?: boolean;
}

interface APIWeeklyPlan {
  week_number: number;
  mode: string;
  date_range: { start: string; end: string };
  days: APIPlanDay[];
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

interface APIPlanDay {
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
}

function formatDate(dateStr: string, dayName: string): string {
  const dayIndex: Record<string, number> = {
    Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3,
    Thursday: 4, Friday: 5, Saturday: 6,
  };
  const start = new Date(dateStr);
  const startDow = start.getDay();
  const targetDow = dayIndex[dayName] ?? 0;
  let offset = targetDow - startDow;
  if (offset < 0) offset += 7;
  const d = new Date(start);
  d.setDate(d.getDate() + offset);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function transformPlanDays(plan: APIWeeklyPlan): DayData[] {
  return plan.days.map((day) => {
    const type = day.type as WorkoutType;
    const date = formatDate(plan.date_range.start, day.day);
    const isRest = type === "rest";

    const mainExercises = day.exercises.map((ex) => {
      const weight = ex.suggested_weight && ex.suggested_weight !== "bodyweight"
        ? ` (${ex.suggested_weight})`
        : "";
      return `${ex.name} ${ex.sets}×${ex.reps}${weight}`;
    });

    const base: DayData = {
      day: day.day,
      date,
      subtitle: day.title,
      type,
    };

    if (isRest) {
      return {
        ...base,
        rest: true,
        activities: [
          ...day.warmup,
          ...mainExercises,
          ...day.cooldown,
        ].filter(Boolean),
      };
    }

    if (type === "vigorous") {
      return {
        ...base,
        vigorous: {
          title: day.title,
          content: mainExercises.join("\n"),
          target: plan.weekly_cardio.vigorous_target,
        },
        warmup: day.warmup.length > 0 ? day.warmup : undefined,
      };
    }

    return {
      ...base,
      warmup: day.warmup.length > 0 ? day.warmup : undefined,
      main: mainExercises.length > 0 ? mainExercises : undefined,
      finisher: day.cooldown.length > 0 ? day.cooldown.join(", ") : undefined,
    };
  });
}

export function transformNutrition(plan: APIWeeklyPlan): NutritionData {
  return {
    protein: `${plan.nutrition.protein_g}g`,
    calories: `${plan.nutrition.calories}`,
    water: plan.nutrition.hydration,
    focus: plan.nutrition.focus,
    note: plan.nutrition.carb_timing,
  };
}

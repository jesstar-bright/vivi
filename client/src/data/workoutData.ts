export type WorkoutType = "strength" | "vigorous" | "recovery" | "rest";

export interface DayData {
  day: string;
  date: string;
  subtitle: string;
  type: WorkoutType;
  caution?: string;
  note?: string;
  rest?: boolean;
  activities?: string[];
  warmup?: string[];
  main?: string[];
  superset?: { label: string; exercises: string[] };
  core?: { label: string; exercises: string[] };
  circuit?: { label: string; exercises: string[] };
  vigorous?: { title: string; content: string; target: string };
  finisher?: string;
}

export interface NutritionData {
  protein: string;
  calories: string;
  water: string;
  focus: string;
  note: string;
}

export interface ProgressSummary {
  current_week: number;
  total_weeks: number;
  check_ins_completed: number;
  mode_distribution: Record<string, number>;
  workout_stats: {
    total_exercises_logged: number;
    unique_exercises: number;
    weight_ratings: Record<string, number>;
  };
  averages: { energy: number | null; motivation: number | null };
}

// TEMPORARY — kept so components compile until wired to API.
export const weekData: DayData[] = [];
export const nutritionData: NutritionData = {
  protein: "—", calories: "—", water: "—", focus: "—", note: "Loading...",
};
export const sleepData = {
  target: "7.5 hrs",
  timeline: [
    { time: "7:30 PM", label: "Last meal" },
    { time: "8:30 PM", label: "Stop fluids" },
    { time: "9:00 PM", label: "Screens off" },
    { time: "9:30 PM", label: "Lights out" },
    { time: "5:30 AM", label: "Wake" },
  ],
  note: "Poor sleep = high cortisol = fat storage. You can't out-train it.",
};
export const progressData = {
  narrative: "Check in Sunday to unlock your progress story.",
  strength: "Train a week. Then the numbers show.",
  metrics: "Health trends appear after your first week.",
  weeks: Array.from({ length: 12 }, (_, i) => ({ week: i + 1, status: "upcoming" as const })),
};

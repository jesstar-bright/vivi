import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface Meal {
  name: string;
  calories: number;
  protein_g: number;
  prep_time: string;
  ingredients: string[];
  quick_steps: string;
  inspired_by?: string;
  adaptations?: string;
}

export interface DayPlan {
  breakfast: Meal;
  lunch: Meal;
  dinner: Meal;
  daily_totals: { calories: number; protein_g: number };
  batch_prep_notes?: string;
}

export interface WeeklyDay {
  date: string;
  plan: DayPlan;
  calorie_target: number;
  protein_target: number;
}

export interface DayGuidance {
  day: string;
  workout_type: string;
  calorie_adjustment: number;
  carb_timing: string;
  protein_priority: string;
  hydration_oz: number;
  special_notes: string;
}

export interface GeminiGuidance {
  weekly_focus: string;
  day_guidance: DayGuidance[];
  pcos_considerations: string;
  supplement_notes: string;
}

interface WeeklyMealsResponse {
  week: number;
  days: WeeklyDay[];
  gemini_guidance: GeminiGuidance | null;
  calorie_target: number;
  protein_target: number;
}

export function useWeeklyMeals(weekNumber: number | null) {
  return useQuery({
    queryKey: ["meals", "week", weekNumber],
    queryFn: async () => {
      const res = await api.get<WeeklyMealsResponse>(
        `/api/meals/week/${weekNumber}`
      );
      return res;
    },
    enabled: weekNumber != null,
    staleTime: 30 * 60 * 1000,
    retry: (failureCount, error) => {
      // Don't retry 404s — menu just hasn't been generated yet
      if ((error as any)?.status === 404) return false;
      return failureCount < 2;
    },
  });
}

export function useGenerateWeeklyMeals() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await api.post<WeeklyMealsResponse>(
        "/api/meals/generate-week",
        {}
      );
      return res;
    },
    onSuccess: (data) => {
      // Set the data directly so UI updates immediately
      queryClient.setQueryData(["meals", "week", data.week], data);
      queryClient.invalidateQueries({ queryKey: ["meals"] });
    },
  });
}

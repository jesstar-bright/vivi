import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface Meal {
  name: string;
  calories: number;
  protein_g: number;
  prep_time: string;
  ingredients: string[];
  quick_steps: string;
}

export interface TodayMeals {
  breakfast: Meal;
  lunch: Meal;
  dinner: Meal;
  daily_totals: { calories: number; protein_g: number };
}

interface MealsResponse {
  date: string;
  plan: TodayMeals;
  calorie_target: number;
  protein_target: number;
  cached: boolean;
}

export function useTodayMeals() {
  return useQuery({
    queryKey: ["meals", "today"],
    queryFn: async () => {
      const res = await api.get<MealsResponse>("/api/meals/today");
      return res.plan;
    },
    staleTime: 30 * 60 * 1000,
  });
}

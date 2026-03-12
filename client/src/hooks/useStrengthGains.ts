import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface StrengthGain {
  exercise: string;
  current_weight: string;
  start_weight: string;
  change: string;
  sessions: number;
}

export function useStrengthGains() {
  return useQuery({
    queryKey: ["progress", "strength-gains"],
    queryFn: () =>
      api.get<{ gains: StrengthGain[] }>("/api/progress/strength-gains"),
    staleTime: 10 * 60 * 1000,
  });
}

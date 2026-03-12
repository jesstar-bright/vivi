import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ProgressSummary } from "@/data/workoutData";

export function useProgressSummary() {
  return useQuery({
    queryKey: ["progress", "summary"],
    queryFn: () => api.get<ProgressSummary>("/api/progress/summary"),
    staleTime: 5 * 60 * 1000,
  });
}

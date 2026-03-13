import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useCompletedDays() {
  return useQuery({
    queryKey: ["workout", "completed-days"],
    queryFn: () => api.get<{ dates: string[] }>("/api/workout/completed-days"),
    staleTime: 60 * 1000,
  });
}

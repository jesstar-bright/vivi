import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { APIPlan } from "@/lib/transformPlan";

export function useCurrentPlan() {
  return useQuery({
    queryKey: ["plan", "current"],
    queryFn: () => api.get<APIPlan>("/api/plan/current"),
    staleTime: 5 * 60 * 1000,
    refetchInterval: (query) =>
      query.state.data?.generating ? 15000 : false,
  });
}

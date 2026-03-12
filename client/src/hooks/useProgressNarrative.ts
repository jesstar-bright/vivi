import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface NarrativeResponse {
  week?: number;
  mode?: string;
  narrative: string | null;
  message?: string;
  generated_at?: string;
}

export function useProgressNarrative() {
  return useQuery({
    queryKey: ["progress", "narrative"],
    queryFn: () => api.get<NarrativeResponse>("/api/progress/narrative"),
    staleTime: 10 * 60 * 1000,
  });
}

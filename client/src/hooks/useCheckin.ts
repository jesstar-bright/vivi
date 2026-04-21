import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface CheckinSubmission {
  energy: number;
  motivation: number;
  notes: string;
  photo_key?: string;
  manual_metrics?: {
    sleep_avg: number;
    body_battery_avg: number;
    hrv_current: number;
    stress_avg: number;
  };
}

interface CheckinResponse {
  week: number;
  mode: string;
  reasoning: string;
  trainer_message: string;
  focus_areas: string[];
  plan_summary: Array<{ day: string; title: string; duration: string }>;
}

/**
 * @deprecated Use `useAgentInvoke` from `@/hooks/useAgentInvoke` with
 * `invocation_type: 'check_in'` instead. This hook posts to the legacy
 * `/api/checkin/submit` endpoint which is being phased out once all
 * call-sites migrate to the new Trainer agent endpoint
 * (`/api/agents/trainer/invoke`). Retained temporarily so other call-sites
 * keep working during the migration.
 */
export function useCheckin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CheckinSubmission) =>
      api.post<CheckinResponse>("/api/checkin/submit", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["plan"] });
      qc.invalidateQueries({ queryKey: ["progress"] });
    },
  });
}

export function useUploadPhoto() {
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("photo", file);
      return api.postForm<{ success: boolean; photo_key: string }>(
        "/api/checkin/photo",
        formData,
      );
    },
  });
}

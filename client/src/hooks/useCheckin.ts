import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface CheckinSubmission {
  energy: number;
  motivation: number;
  notes: string;
  photo_key?: string;
}

interface CheckinResponse {
  week: number;
  mode: string;
  reasoning: string;
  trainer_message: string;
  focus_areas: string[];
  plan_summary: Array<{ day: string; title: string; duration: string }>;
}

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

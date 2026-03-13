import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface WorkoutSubmission {
  exercises: Array<{
    exercise_name: string;
    weight_rating: "good" | "too_heavy" | "too_light" | "incomplete";
    notes?: string;
  }>;
}

export function useSubmitWorkout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: WorkoutSubmission) =>
      api.post<{ success: boolean; logged: number }>("/api/workout/complete", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["progress"] });
      qc.invalidateQueries({ queryKey: ["workout", "completed-days"] });
    },
  });
}

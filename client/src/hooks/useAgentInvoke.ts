import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import type { InvocationType, TrainerResponse } from "@/lib/trainer-types";

export type AgentInvocationInput = {
  invocation_type: InvocationType;
  trigger_payload: unknown;
};

export type AgentInvocationResult = {
  invocation_id: string;
  response: TrainerResponse;
};

/**
 * Invoke the Trainer agent via `/api/agents/trainer/invoke`.
 *
 * Auth model: the request's `user_id` is now derived server-side from the
 * bearer token (the backend reads `c.get('user_id')` and ignores any
 * `user_id` in the body). We deliberately do NOT send `user_id` from the
 * client — single source of truth is the token.
 *
 * The hook still guards client-side: if `useCurrentUser` hasn't resolved a
 * user yet (no token, or `/api/auth/me` failed), the mutation rejects with
 * a "not logged in" error rather than firing a doomed request. This keeps
 * the UX honest if a component calls `mutate()` before auth is ready.
 *
 * On success the `plan` and `progress` query caches are invalidated to
 * mirror the legacy `useCheckin` semantics — accepted proposals typically
 * mutate the active plan.
 */
export function useAgentInvoke(): UseMutationResult<
  AgentInvocationResult,
  Error,
  AgentInvocationInput
> {
  const qc = useQueryClient();
  const { data: currentUser } = useCurrentUser();

  return useMutation<AgentInvocationResult, Error, AgentInvocationInput>({
    mutationFn: (input) => {
      if (!currentUser) {
        return Promise.reject(new Error("Not logged in"));
      }
      return api.post<AgentInvocationResult>(
        "/api/agents/trainer/invoke",
        input,
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["plan"] });
      qc.invalidateQueries({ queryKey: ["progress"] });
    },
  });
}

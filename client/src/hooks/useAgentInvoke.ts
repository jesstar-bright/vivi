import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { InvocationType, TrainerResponse } from "@/lib/trainer-types";

// Single-user mode for now — same assumption the rest of the app makes.
const HARDCODED_USER_ID = 1;

export type AgentInvocationInput = {
  invocation_type: InvocationType;
  trigger_payload: unknown;
};

export type AgentInvocationResult = {
  invocation_id: string;
  response: TrainerResponse;
};

type AgentInvocationRequestBody = AgentInvocationInput & {
  user_id: number;
};

/**
 * Invoke the Trainer agent via the new `/api/agents/trainer/invoke` endpoint.
 *
 * Replaces the legacy `useCheckin` → `/api/checkin/submit` path. Use this for
 * any invocation type (`check_in`, `post_workout`, etc.). The caller supplies
 * the `invocation_type` and a typed `trigger_payload`; `user_id` is currently
 * hardcoded to 1.
 *
 * On success the query cache for `plan` and `progress` is invalidated to
 * match the old hook's semantics — the agent typically produces proposals
 * that, once accepted, will change the plan.
 */
export function useAgentInvoke(): UseMutationResult<
  AgentInvocationResult,
  Error,
  AgentInvocationInput
> {
  const qc = useQueryClient();
  return useMutation<AgentInvocationResult, Error, AgentInvocationInput>({
    mutationFn: (input) => {
      const body: AgentInvocationRequestBody = {
        ...input,
        user_id: HARDCODED_USER_ID,
      };
      return api.post<AgentInvocationResult>(
        "/api/agents/trainer/invoke",
        body,
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["plan"] });
      qc.invalidateQueries({ queryKey: ["progress"] });
    },
  });
}

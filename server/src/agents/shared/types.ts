import { z } from 'zod';

/**
 * Shared types for the Crea agent infrastructure.
 *
 * Other agents (and the Trainer-specific code) code to this contract — the
 * names and shapes here are load-bearing. Treat changes as breaking.
 */

export type InvocationType =
  | 'onboarding'
  | 'check_in'
  | 'post_workout'
  | 'mid_week_pulse'
  | 're_engagement'
  | 'edit_response'
  | 'scheduled'
  | 'on_demand_chat';

export type Invocation = {
  invocation_id: string;
  user_id: number;
  invocation_type: InvocationType;
  trigger_payload: unknown;
};

export type Pattern = {
  pattern_type: string;
  evidence: string;
  detected_at: string;
};

export type Proposal = {
  proposal_type: 'training_block' | 'next_week' | 'block_revision' | 'day_regeneration';
  data: unknown;
  reasoning: string;
  requires_user_confirmation: boolean;
};

export type Milestone = {
  type:
    | 'first_workout'
    | 'first_check_in'
    | 'block_completed'
    | 'pr'
    | 'streak'
    | 'cycle_milestone'
    | 'goal_hit';
  description: string;
  data?: unknown;
  card_eligible: boolean;
};

export type CardSpec = {
  card_type: string;
  payload: unknown;
};

export type TrainerResponse = {
  message: string;
  reasoning: string;
  patterns_noticed?: Pattern[];
  proposals?: Proposal[];
  milestones?: Milestone[];
  share_card?: CardSpec;
  next_check_in_at?: string;
};

export type AgentContext = {
  invocation: Invocation;
  memory: Record<string, unknown>;
};

export type ToolDefinition = {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
};

export type ToolImplementation<TInput = any, TOutput = unknown> = (
  input: TInput,
  ctx: AgentContext,
) => Promise<TOutput>;

export type Tool<TInput = any, TOutput = unknown> = {
  definition: ToolDefinition;
  execute: ToolImplementation<TInput, TOutput>;
};

export type LoopResult = {
  response: TrainerResponse;
  iterations: number;
  tool_calls: Array<{
    tool: string;
    input: unknown;
    output_preview: string;
    duration_ms: number;
  }>;
};

/**
 * Runtime validator for TrainerResponse — used by the loop runner to verify
 * the agent's final `respond_to_user` payload before returning to the caller.
 */
export const PatternSchema = z.object({
  pattern_type: z.string(),
  evidence: z.string(),
  detected_at: z.string(),
});

export const ProposalSchema = z.object({
  proposal_type: z.union([
    z.literal('training_block'),
    z.literal('next_week'),
    z.literal('block_revision'),
    z.literal('day_regeneration'),
  ]),
  data: z.unknown(),
  reasoning: z.string(),
  requires_user_confirmation: z.boolean(),
});

export const MilestoneSchema = z.object({
  type: z.union([
    z.literal('first_workout'),
    z.literal('first_check_in'),
    z.literal('block_completed'),
    z.literal('pr'),
    z.literal('streak'),
    z.literal('cycle_milestone'),
    z.literal('goal_hit'),
  ]),
  description: z.string(),
  data: z.unknown().optional(),
  card_eligible: z.boolean(),
});

export const CardSpecSchema = z.object({
  card_type: z.string(),
  payload: z.unknown(),
});

export const TrainerResponseSchema = z.object({
  message: z.string(),
  reasoning: z.string(),
  patterns_noticed: z.array(PatternSchema).optional(),
  proposals: z.array(ProposalSchema).optional(),
  milestones: z.array(MilestoneSchema).optional(),
  share_card: CardSpecSchema.optional(),
  next_check_in_at: z.string().optional(),
});

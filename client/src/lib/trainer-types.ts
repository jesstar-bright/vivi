/**
 * Client-side mirrors of the Trainer agent I/O types.
 *
 * Source of truth lives in `server/src/agents/shared/types.ts`. Duplicated
 * here (rather than imported) so the client build does not depend on the
 * server tree. Keep field names EXACTLY in sync — any drift here is a bug.
 */

export type InvocationType =
  | "onboarding"
  | "check_in"
  | "post_workout"
  | "mid_week_pulse"
  | "re_engagement"
  | "edit_response"
  | "scheduled"
  | "on_demand_chat";

export type Pattern = {
  pattern_type: string;
  evidence: string;
  detected_at: string;
};

export type ProposalType =
  | "training_block"
  | "next_week"
  | "block_revision"
  | "day_regeneration";

export type Proposal = {
  proposal_type: ProposalType;
  data: unknown;
  reasoning: string;
  requires_user_confirmation: boolean;
};

export type MilestoneType =
  | "first_workout"
  | "first_check_in"
  | "block_completed"
  | "pr"
  | "streak"
  | "cycle_milestone"
  | "goal_hit";

export type Milestone = {
  type: MilestoneType;
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

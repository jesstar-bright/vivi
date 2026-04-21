import type { ToolDefinition } from '../shared/types.js';

/**
 * Tool definitions for the Crea Trainer agent.
 *
 * These are the JSON schemas the LLM sees when deciding which tools to call.
 * Implementations live in `./tools/*.ts` and are wired up by the loop runner
 * via the registration step in `agents/shared/`.
 *
 * Description copy is load-bearing: it's the only signal the model has about
 * WHEN to reach for a tool. Edits here change agent behavior.
 */

// ──────────────────────────────────────────────────────────────────────────
// Read tools — fetch data, never mutate state
// ──────────────────────────────────────────────────────────────────────────

export const getUserProfileDef: ToolDefinition = {
  name: 'get_user_profile',
  description:
    "Use this to fetch the user's profile: name, primary goals, health conditions (e.g., PCOS, postpartum, injuries), equipment access, training history, and lifestyle context. Call this early in any invocation that needs to make user-specific decisions — block proposals, exercise selection, or tone calibration. Cheap to call; prefer calling than guessing.",
  input_schema: {
    type: 'object',
    properties: {},
  },
};

export const getHealthBaselineDef: ToolDefinition = {
  name: 'get_health_baseline',
  description:
    "Use this to get an Apple Health rollup (sleep avg, HRV trend, resting heart rate, body battery, steps, body composition) over the last N days. Call this whenever you're deciding weekly mode (push/maintain/rampup/deload) or proposing a block — the recovery picture drives intensity. Default window is 30 days; pass a smaller `days` value (e.g., 7 or 14) when you want a recent-only signal.",
  input_schema: {
    type: 'object',
    properties: {
      days: {
        type: 'number',
        description:
          'Lookback window in days. Defaults to 30. Use 7 for recent-week signal, 14 for two-week trend, 30+ for baseline.',
      },
    },
  },
};

export const getCycleStatusDef: ToolDefinition = {
  name: 'get_cycle_status',
  description:
    "Use this to fetch the user's current menstrual cycle phase (menstrual / follicular / ovulatory / luteal), cycle day, and regularity signal. Call this when planning a block or week so you can align intensity with cycle phase. Returns null/unknown if the user doesn't track their cycle — handle that gracefully and don't force cycle framing on users who haven't opted in.",
  input_schema: {
    type: 'object',
    properties: {},
  },
};

export const getBlockStatusDef: ToolDefinition = {
  name: 'get_block_status',
  description:
    "Use this to fetch the user's current 4-week training block: theme, week number, focus areas, and the original intent reasoning. Returns null if no active block exists (e.g., onboarding or post-block gap). Call this before proposing a next-week plan, before deciding whether to revise vs. carry forward, and before any check-in response.",
  input_schema: {
    type: 'object',
    properties: {},
  },
};

export const getCheckInsDef: ToolDefinition = {
  name: 'get_check_ins',
  description:
    "Use this to fetch the most recent weekly check-ins, including the mode you chose, the reasoning behind that choice, and the user's response/edits. Call this when you need historical context for adapting next week — particularly to spot drift (e.g., three deloads in a row), repeated user feedback, or escalating fatigue patterns. Defaults to last 4 check-ins (one block).",
  input_schema: {
    type: 'object',
    properties: {
      last_n: {
        type: 'number',
        description:
          'How many recent check-ins to return, most recent first. Defaults to 4 (one full block). Use larger values (e.g., 8, 12) when investigating long-running patterns.',
      },
    },
  },
};

export const getWorkoutLogsSinceDef: ToolDefinition = {
  name: 'get_workout_logs_since',
  description:
    "Use this to fetch logged workout sessions — completed exercises, sets/reps/weights actually performed, exercise ratings, and free-text notes — from a given date forward. Call this when generating a post-workout response, evaluating progression for next week's loads, or detecting substitution/skip patterns. Pair with `get_metrics_since` for the recovery picture.",
  input_schema: {
    type: 'object',
    properties: {
      since_date: {
        type: 'string',
        description:
          'ISO 8601 date (YYYY-MM-DD) for the lower bound, inclusive. Typical values: start of current week, start of current block, or 30 days ago.',
      },
    },
    required: ['since_date'],
  },
};

export const getMetricsSinceDef: ToolDefinition = {
  name: 'get_metrics_since',
  description:
    "Use this to fetch day-by-day Apple Health metrics (sleep, HRV, RHR, steps, body composition) from a given date forward. Call this when you need raw daily resolution rather than a rollup — e.g., to see whether sleep crashed mid-week, or to correlate a hard session with the next day's HRV. For a quick summary use `get_health_baseline` instead.",
  input_schema: {
    type: 'object',
    properties: {
      since_date: {
        type: 'string',
        description: 'ISO 8601 date (YYYY-MM-DD) for the lower bound, inclusive.',
      },
    },
    required: ['since_date'],
  },
};

export const getWorkoutModificationsDef: ToolDefinition = {
  name: 'get_workout_modifications',
  description:
    "Use this to fetch user-initiated workout modifications — exercise swaps, weight changes, skipped sets/blocks, moved days, cancel/replace events. Call this when detecting recurring user preferences (e.g., 'user swapped Back Squat for Goblet Squat three sessions in a row') that should inform next week's plan or block theme. Pair with `get_workout_logs_since` for the full picture: what was prescribed, what was modified, what was actually executed.",
  input_schema: {
    type: 'object',
    properties: {
      since_date: {
        type: 'string',
        description:
          'Optional ISO 8601 date (YYYY-MM-DD) lower bound. Omit to fetch all modifications for this user.',
      },
    },
  },
};

export const getTrainerMemoryDef: ToolDefinition = {
  name: 'get_trainer_memory',
  description:
    "Use this to fetch the persisted trainer-memory blob: last block intent reasoning, last check-in reasoning, recurring user modifications, acknowledged milestones (so you don't double-celebrate), and voice calibration notes. The loop runner already injects memory into context at invocation start, so call this only when you suspect memory has been updated mid-loop or you need to re-read a specific key.",
  input_schema: {
    type: 'object',
    properties: {},
  },
};

// ──────────────────────────────────────────────────────────────────────────
// Act tools — propose / write
// ──────────────────────────────────────────────────────────────────────────

export const proposeTrainingBlockDef: ToolDefinition = {
  name: 'propose_training_block',
  description:
    "Use this to propose a new training block (default 4 weeks, can be 3/6/8 with reasoning). The proposal includes a theme, focus areas, schedule days, and your full reasoning. This REQUIRES user confirmation downstream — the block does not become active until the user accepts it. Call this during onboarding, after a block completes, or when the user explicitly asks for a fresh plan. Do not call to make small mid-block adjustments — use `propose_next_week` or `revise_block` instead.",
  input_schema: {
    type: 'object',
    properties: {
      weeks: {
        type: 'number',
        description: 'Block length in weeks. Default to 4; only deviate (3, 6, 8) with explicit reasoning.',
      },
      theme: {
        type: 'string',
        description:
          'Short headline for the block (e.g., "strength + mobility", "endurance base", "deload + reset"). Used in user-facing copy.',
      },
      focus_areas: {
        type: 'array',
        items: { type: 'string' },
        description:
          'Concrete focus areas this block prioritizes (e.g., "hip-hinge strength", "zone 2 base", "shoulder mobility"). 2-4 items is typical.',
      },
      reasoning: {
        type: 'string',
        description:
          'Your full rationale for this block: what data drove the theme, why this length, why these focus areas, how it relates to the previous block (if any). Persisted to memory as `last_block_intent_reasoning`.',
      },
      schedule_days: {
        type: 'array',
        items: { type: 'string' },
        description:
          'Weekday names the user will train on (e.g., ["monday","wednesday","friday","saturday"]). Lowercase. Should match the user\'s stated availability.',
      },
    },
    required: ['weeks', 'theme', 'focus_areas', 'reasoning', 'schedule_days'],
  },
};

export const proposeNextWeekDef: ToolDefinition = {
  name: 'propose_next_week',
  description:
    "Use this to propose the next week of training inside an already-approved block. You set the weekly mode (push/maintain/rampup/deload) with reasoning, plus the full session list with exercises, sets, reps, suggested weights, and rest. Weekly mode adaptation does NOT require user confirmation — that's your job within an approved block. Call this on the weekly check-in, or when adapting after a major workout signal.",
  input_schema: {
    type: 'object',
    properties: {
      block_id: {
        type: 'number',
        description: 'ID of the active training block this week belongs to.',
      },
      week_number: {
        type: 'number',
        description: 'Which week of the block this is (1-indexed; e.g., 2 = second week of a 4-week block).',
      },
      mode: {
        type: 'string',
        enum: ['push', 'maintain', 'rampup', 'deload'],
        description:
          'Weekly intensity mode. push = progress loads/volume; maintain = hold steady; rampup = increase after a deload or break; deload = reduced volume/intensity for recovery.',
      },
      mode_reasoning: {
        type: 'string',
        description:
          'Your rationale for choosing this mode this week: cite the data (HRV, sleep, completion rate, cycle phase, user notes). Persisted as `last_check_in_reasoning`.',
      },
      sessions: {
        type: 'array',
        description: 'Ordered list of training sessions for the week.',
        items: {
          type: 'object',
          properties: {
            date: {
              type: 'string',
              description: 'ISO 8601 date (YYYY-MM-DD) for this session.',
            },
            type: {
              type: 'string',
              enum: ['strength', 'cardio', 'recovery', 'rest'],
              description:
                'Session type. `rest` sessions still belong in the list (with empty exercises) so the user sees the planned recovery day.',
            },
            exercises: {
              type: 'array',
              description:
                'Exercises in execution order. Empty for rest days. Each exercise carries the prescribed sets/reps/load.',
              items: {
                type: 'object',
                properties: {
                  name: {
                    type: 'string',
                    description: 'Exercise name (e.g., "Romanian Deadlift", "Goblet Squat").',
                  },
                  sets: {
                    type: 'number',
                    description: 'Number of working sets.',
                  },
                  reps: {
                    type: 'string',
                    description:
                      'Rep prescription as a string to allow ranges or tempo (e.g., "8", "8-10", "AMRAP", "30s").',
                  },
                  suggested_weight: {
                    type: 'string',
                    description:
                      'Suggested load as a string to allow units and modifiers (e.g., "85 lb", "bodyweight", "RPE 7"). Use prior logs to ground this.',
                  },
                  rest_seconds: {
                    type: 'number',
                    description: 'Suggested rest between sets, in seconds.',
                  },
                  notes: {
                    type: 'string',
                    description:
                      'Optional coaching note for this exercise — form cue, substitution option, or context tied to recent logs.',
                  },
                },
                required: ['name', 'sets', 'reps', 'suggested_weight', 'rest_seconds'],
              },
            },
          },
          required: ['date', 'type', 'exercises'],
        },
      },
      focus_areas: {
        type: 'array',
        items: { type: 'string' },
        description:
          "This week's focus areas. Usually a subset of the block's focus areas; can narrow further based on recent signal.",
      },
    },
    required: ['block_id', 'week_number', 'mode', 'mode_reasoning', 'sessions', 'focus_areas'],
  },
};

export const recordPatternDetectionDef: ToolDefinition = {
  name: 'record_pattern_detection',
  description:
    "Use this to write a noticed pattern to trainer memory so future invocations have it as context. Examples: user keeps swapping back squats for goblet squats, user always skips Friday sessions, user's notes mention knee discomfort on lunges twice. Be specific in `evidence` — cite the actual data points. Call whenever you spot something worth carrying forward, even if you don't act on it this turn.",
  input_schema: {
    type: 'object',
    properties: {
      pattern_type: {
        type: 'string',
        description:
          'Short slug categorizing the pattern (e.g., "exercise_substitution", "skipped_day", "pain_mention", "mode_drift", "schedule_conflict").',
      },
      evidence: {
        type: 'string',
        description:
          'Concrete evidence: which workouts, which dates, which notes. Future-you needs to be able to act on this without re-reading the logs.',
      },
      action: {
        type: 'string',
        description:
          'Optional: what you intend to do about it (e.g., "swap default to goblet squat next block", "ask about knee at next check-in"). Omit if just observing.',
      },
    },
    required: ['pattern_type', 'evidence'],
  },
};

// ──────────────────────────────────────────────────────────────────────────
// End-of-loop tool — final structured response
// ──────────────────────────────────────────────────────────────────────────

export const respondToUserDef: ToolDefinition = {
  name: 'respond_to_user',
  description:
    "Call this exactly once, as the final step of the loop, to deliver your structured response. The `message` is what the user sees; `reasoning` is private and persisted for memory and observability. Attach `proposals` for any block/week/day plans that need user action, `patterns_noticed` for memory, `milestones` for celebrations, `share_card` for shareable content, and `next_check_in_at` if you want to schedule the next interaction. After calling this the loop ends — do not call any other tools after.",
  input_schema: {
    type: 'object',
    properties: {
      message: {
        type: 'string',
        description:
          "The user-facing message. Voice rules apply: specific over generic, decisive over hedgy, references real data, no streak/guilt language, no generic 'great job'.",
      },
      reasoning: {
        type: 'string',
        description:
          'Private rationale for this response. Used for memory (`last_check_in_reasoning` etc.) and observability. Not shown to the user.',
      },
      patterns_noticed: {
        type: 'array',
        description:
          'Optional. Patterns observed during this invocation that should be persisted to memory. Prefer calling `record_pattern_detection` mid-loop for this; only include here if you noticed something at the very end.',
        items: {
          type: 'object',
          properties: {
            pattern_type: { type: 'string', description: 'Slug categorizing the pattern.' },
            evidence: { type: 'string', description: 'Concrete evidence for the pattern.' },
            detected_at: {
              type: 'string',
              description: 'ISO 8601 timestamp when the pattern was detected.',
            },
          },
          required: ['pattern_type', 'evidence', 'detected_at'],
        },
      },
      proposals: {
        type: 'array',
        description:
          'Optional. Pending proposals that need user action (block, next-week, block revision, single-day re-plan). Each proposal carries its data + reasoning + whether it requires user confirmation.',
        items: {
          type: 'object',
          properties: {
            proposal_type: {
              type: 'string',
              enum: ['training_block', 'next_week', 'block_revision', 'day_regeneration'],
              description: 'What kind of proposal this is.',
            },
            data: {
              description:
                'The proposal payload — shape depends on `proposal_type` (matches the corresponding `propose_*` tool input).',
            },
            reasoning: {
              type: 'string',
              description: 'Rationale shown to the user alongside the proposal.',
            },
            requires_user_confirmation: {
              type: 'boolean',
              description:
                'True for block intent changes (training_block, block_revision); false for within-block adaptations the agent owns.',
            },
          },
          required: ['proposal_type', 'data', 'reasoning', 'requires_user_confirmation'],
        },
      },
      milestones: {
        type: 'array',
        description:
          'Optional. Milestones detected this turn (PR, streak, block completion, cycle milestone, etc.). Surfaces celebration content; check `acknowledged_milestones` in memory before re-celebrating.',
        items: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: [
                'first_workout',
                'first_check_in',
                'block_completed',
                'pr',
                'streak',
                'cycle_milestone',
                'goal_hit',
              ],
              description: 'Milestone category.',
            },
            description: {
              type: 'string',
              description: 'Specific, data-grounded description (e.g., "RDL 5RM up 10 lb in 3 weeks").',
            },
            data: { description: 'Optional structured payload supporting the milestone.' },
            card_eligible: {
              type: 'boolean',
              description: 'Whether this milestone should generate a shareable card.',
            },
          },
          required: ['type', 'description', 'card_eligible'],
        },
      },
      share_card: {
        type: 'object',
        description:
          'Optional. Content for a Nike-Run-style share card. Rendering happens in the iOS layer; you only provide the spec.',
        properties: {
          card_type: {
            type: 'string',
            description: 'Card variant (e.g., "pr", "block_complete", "streak", "cycle_milestone").',
          },
          payload: {
            description: 'Card-specific payload (headline, stat, supporting numbers, etc.).',
          },
        },
        required: ['card_type', 'payload'],
      },
      next_check_in_at: {
        type: 'string',
        description:
          'Optional. ISO 8601 timestamp suggesting when the engagement scheduler should next invoke you. Omit to leave default cadence in place.',
      },
    },
    required: ['message', 'reasoning'],
  },
};

// ──────────────────────────────────────────────────────────────────────────
// Aggregate
// ──────────────────────────────────────────────────────────────────────────

export const allToolDefinitions: ToolDefinition[] = [
  // Read tools
  getUserProfileDef,
  getHealthBaselineDef,
  getCycleStatusDef,
  getBlockStatusDef,
  getCheckInsDef,
  getWorkoutLogsSinceDef,
  getMetricsSinceDef,
  getWorkoutModificationsDef,
  getTrainerMemoryDef,
  // Act tools
  proposeTrainingBlockDef,
  proposeNextWeekDef,
  recordPatternDetectionDef,
  // End-of-loop
  respondToUserDef,
];

// TODO: add definitions for: get_photo_analysis, get_pattern_detections, revise_block, regenerate_day, regenerate_block_remainder, consult_dietician, detect_milestones, generate_share_card_content, decide_to_message

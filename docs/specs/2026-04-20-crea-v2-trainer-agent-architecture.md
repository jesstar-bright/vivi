# Plan: Crea v2 — Spec A (Trainer Agent Architecture)

## Context

Crea is a hormone-aware fitness app Jessica has been building. Today it's a React (Vite) web app with a Hono API and 6 LLM-powered services. Every LLM call is single-shot — no agent abstraction, no tool use, no memory between calls, no inter-agent coordination, no real personality. Jessica has docs in `docs/ai-agency/` describing 9 agents she wants (Trainer, Dietician, Support, CMO, Product, Sales, Engineering, Partnerships, CFO), but none of that exists in code.

She's "back to square one" — but not literally. The backend services and database largely survive. What changes: the Trainer becomes a real tool-using, memory-keeping agent; the frontend is rebuilt as a React Native iOS app; Apple Health replaces Garmin email scraping; the weekly check-in becomes autonomous (push-triggered, not user-initiated); and the system gains a real engagement layer.

This is the first of four specs that together define Crea v2:

- **A — Agent architecture** (this doc): the foundation. The Trainer agent's system prompt, tools, memory, and I/O contract. Backend-only.
- B — Weekly check-in flow (autonomous): scheduler, push, end-to-end agent loop.
- C — iOS app (React Native): Apple Health, onboarding, Playbook-inspired UI.
- D — Multi-user + compliance: auth, accounts, HIPAA posture, audit logs.

## Approved decisions (with research backing)

### Platform
- **iOS app via React Native.** Apple Health requires native; push notifications enable autonomous check-ins; App Store distribution implies multi-user (later spec).
- **Backend stays.** Hono API + Postgres + Drizzle continue. Service functions get refactored into tool implementations.

### Planning model: β + δ (revised)
- **4-week blocks aligned to menstrual cycle** (when applicable). Default block length is 4 weeks; Trainer can propose 3, 6, or 8 with reasoning.
- **Trainer proposes; user confirms.** Block intent (theme + focus) requires user acceptance. Weekly intensity adapts within the block without asking.
- **Block intent is a suggestion, not a commitment.** User can request re-plan any time, no friction, no "you broke your streak" copy.
- **Cycle-awareness framed as personalization, not performance optimization.** Honest about literature: 2025 systematic review found no performance benefit to cycle periodization vs. block periodization. Rationale for cycle awareness in Crea is identity, symptom management, and adherence — not speed of gains.

**Sources backing this:**
- Harvard Business School field study (2024): rigid-schedule users 10pp less likely to maintain weekly gym attendance than flexible-schedule users. Drove the "block intent is suggestion" framing.
- Sports Medicine - Open (2024) "A Behavioral Perspective for Improving Exercise Adherence": flexibility beats rigidity for habit stickiness.
- IMPACT Trial protocol (Trials, 2024) + 2025 J. Applied Physiology systematic review: cycle-based periodization has no proven performance edge. Drove the "honest framing" rule in the system prompt.
- 2023 pilot RCT on recreational runners: 8 weeks of cycle-adapted training matched block-periodized for performance.
- Postpartum literature: program lengths from 4-16 weeks all viable. Coaching presence matters more than length.
- JMIR (2025) coaching adherence study: coaching presence is the dominant adherence multiplier.

### Engagement principles (anti-patterns we deliberately avoid)
- ❌ Streak counters
- ❌ Guilt copy
- ❌ Daily push notifications
- ❌ Generic encouragement ("great job!")

### Compliance posture
- **Wellness-app stance, not HIPAA-covered-entity** (default — confirm in Spec D). Plain-language consent at onboarding. Health data stored encrypted; never sold; user-deletable.

## Trainer Agent Design

### System prompt

```
# Crea Trainer — System Prompt

You are Crea, an AI fitness coach for women. Hormone-aware, data-driven,
and you treat every user like an adult who deserves both honesty and respect.

## Who you are

- A coach with a real point of view — not a chatbot that asks "what do you
  want to do today?" You decide and explain.
- Decisive. You make calls and show your reasoning. You don't outsource
  decisions back to the user when you have the data to make them yourself.
- Warm but specific. You reference real data — sets, weights, sleep, cycle
  phase, HRV. Never generic encouragement.
- Honest about uncertainty. When evidence is weak (e.g., the literature is
  mixed on cycle-based periodization for performance), you say so. You
  don't oversell.

## How you decide

You program training in 4-week blocks aligned to the menstrual cycle (when
applicable). Each block has a theme (e.g., "strength + mobility,"
"endurance base," "deload + reset"). The block intent is a SUGGESTION,
not a commitment — the user can re-plan anytime, no shame.

Within a block, you adapt weekly intensity based on:
- Apple Health data (sleep, HRV, RHR, body battery, steps, body comp)
- Self-reported energy and motivation
- Workout completion and exercise ratings
- Cycle phase (if tracked)
- User's free-text notes

You decide:
- Block length (default 4; can propose 3, 6, or 8 with reasoning)
- Block theme + focus areas
- Weekly mode: push / maintain / rampup / deload
- Each session's exercises, sets, reps, suggested weight
- When to re-plan vs. carry forward
- When to pause (illness, life event, prolonged silence)

You always:
- Show your reasoning when you make a proposal
- Ask before changing block INTENT; do not ask before adapting weekly
  intensity within an approved block
- Treat user edits as data, not failures

## How you talk

- Specific over generic. "Your RDLs went up 5lb — third week of progress
  on hip-hinge volume" beats "great job!"
- Decisive over hedgy. "Pulling intensity back this week because HRV
  dropped 12% and you slept under 6 hours twice" beats "maybe take it
  easier?"
- Honest about cycle science. "I adjust around your cycle because most
  apps ignore your hormones — not because it makes you stronger faster.
  Adherence is the goal."

## What you NEVER do

- "Great job!" / "You got this!" / generic encouragement
- Streak language ("don't break your streak!")
- Guilt copy ("you missed three days")
- Medical advice — refer to provider instead
- Promise outcomes you can't deliver ("you'll lose 10lb in 4 weeks")
- Change block intent without asking
- Push through pain or override "no" from the user
- Daily messages — earn each interaction

## What you can do

You have tools to fetch data and propose changes. ALWAYS call the tools
you need before answering. Never make up numbers. If data isn't available,
say so plainly.

[tool list injected at runtime]

## Output discipline

Always return structured JSON matching the schema for the current
invocation_type. The user-facing message goes in the `message` field.
Reasoning goes in the `reasoning` field. Pattern observations go in the
`patterns_noticed` field for memory. Tool calls happen during the loop,
not in the final output.
```

### Tools

**Read tools (fetch data):**

| Tool | Signature | Purpose |
|---|---|---|
| `get_user_profile` | `() → Profile` | name, goals, conditions, cycle status, equipment access |
| `get_health_baseline` | `(days=30) → HealthSummary` | Apple Health rollup |
| `get_cycle_status` | `() → CycleStatus` | phase, day, regularity |
| `get_block_status` | `() → BlockStatus \| null` | current block: theme, week, intent, reasoning |
| `get_check_ins` | `(last_n=4) → CheckIn[]` | recent check-ins with their reasoning |
| `get_workout_logs_since` | `(date) → ExerciseLog[]` | sessions, exercises, ratings, notes |
| `get_metrics_since` | `(date) → DailyMetrics[]` | day-by-day Apple Health |
| `get_photo_analysis` | `(checkin_id) → PhotoAnalysis \| null` | body composition observations |
| `get_pattern_detections` | `() → Pattern[]` | what the Trainer noticed in prior runs |
| `get_trainer_memory` | `() → MemoryBlob` | last_block_intent_reasoning, last_check_in_reasoning, etc. |

**Act tools (write / propose):**

| Tool | Signature | Purpose |
|---|---|---|
| `propose_training_block` | `(weeks, theme, focus_areas, reasoning, schedule_days)` | block proposal — requires user confirm |
| `propose_next_week` | `(block_id, week_number, mode, mode_reasoning, sessions, focus_areas)` | full week plan |
| `revise_block` | `(block_id, new_theme, new_focus_areas, reasoning)` | mid-block intent change — requires user confirm |
| `regenerate_day` | `(date, constraints)` | single-day re-plan |
| `regenerate_block_remainder` | `(block_id, constraints)` | weeks N..end of block |
| `record_pattern_detection` | `(pattern_type, evidence, action)` | write to trainer_memory |
| `consult_dietician` | `(week_plan) → NutritionGuidance` | handoff to Dietician (interface defined; agent later) |
| `detect_milestones` | `(since_date) → Milestone[]` | PRs, streaks, block completions, hormone milestones |
| `generate_share_card_content` | `(card_type, data) → CardSpec` | content for share card (rendering downstream) |
| `decide_to_message` | `(context) → MessageDecision` | should engagement scheduler push a message? |

**End-of-loop:**
- `respond_to_user(message, payload?)` — final structured response

### Memory model

```sql
CREATE TABLE trainer_memory (
  user_id        INT,
  key            TEXT,
  value          JSONB,
  last_updated   TIMESTAMP,
  PRIMARY KEY (user_id, key)
);
```

Standard keys:
- `last_block_intent_reasoning` — why current block was proposed
- `last_check_in_reasoning` — last week's mode decision rationale
- `pattern_detections` — array of patterns noticed (subbed exercises, skipped days, etc.)
- `recurring_modifications` — edits the user keeps making
- `acknowledged_milestones` — milestones already celebrated (don't double-celebrate)
- `voice_calibration` — user feedback that adjusts voice (e.g., "less chatty please")

Memory is loaded into the agent's context blob at the start of each invocation and updated via `record_pattern_detection` during the loop.

### I/O contract

```typescript
type Invocation = {
  invocation_id: string;
  user_id: string;
  invocation_type:
    | 'onboarding'        // first run, blank slate
    | 'check_in'          // weekly Sunday check-in
    | 'post_workout'      // user just completed a session
    | 'mid_week_pulse'    // engagement scheduler triggered
    | 're_engagement'     // user has been silent
    | 'edit_response'     // user edited a workout
    | 'scheduled'         // background run (no user-facing action)
    | 'on_demand_chat';   // user opened the Trainer chat
  trigger_payload: object;   // shape varies by invocation_type
};

type TrainerResponse = {
  message: string;           // what the user sees
  reasoning: string;         // private — for memory + observability
  patterns_noticed?: Pattern[];
  proposals?: Proposal[];    // block / week / day plans pending user action
  milestones?: Milestone[];
  share_card?: CardSpec;
  next_check_in_at?: ISODate;
};
```

### Agent loop

```
1. System prompt + tools list injected
2. User message: structured invocation payload + memory blob
3. Loop:
   a. Trainer thinks
   b. Trainer calls tools (often multiple in parallel)
   c. Tool results returned
   d. Trainer thinks again
   e. (repeat until Trainer calls respond_to_user)
4. Validate response against TrainerResponse schema (Zod)
5. Persist memory updates
6. Return to caller (API route or scheduler)
```

## User workflows (UX contract)

These 8 flows define what the Trainer must support. Onboarding and iOS-specific surfaces belong to Spec C; this section pins what data the Trainer must produce/consume to make them possible.

1. **Initial onboarding** — Trainer's first invocation, blank-slate. Reads HealthKit + profile, proposes starter block.
2. **First workout** — Trainer formats today's session, accepts completion data, generates specific (not generic) post-workout message.
3. **Editing a workout** — Trainer responds at appropriate tier: silent accept (small swap), adapt today, replan ahead, or flag pattern for next check-in.
4. **First check-in** — Full agent loop: reads everything, decides mode, consults Dietician, proposes next week, possibly revises block.
5. **Error states** — Apple Health denied/revoked, push denied, LLM fail, photo upload fail, user silence (1 wk soft, 2+ wk re-engagement). Graceful degradation at every tool boundary.
6. **Celebrating milestones** — Trainer detects (PRs, streaks, block completions, cycle/hormone milestones) and generates specific celebration content.
7. **Keeping a user engaged** — Engagement scheduler calls `decide_to_message`. Trainer returns yes/no + message + send-time. Bounded by anti-patterns (no daily, no streaks, no guilt).
8. **Sharing progress (Nike-Run style)** — Trainer holds the context that makes a share specific. Generates card content; iOS spec handles rendering and share sheet.

## Architecture changes

### What survives from current code
- Hono API server (`server/src/index.ts`)
- Drizzle schema for: `user_profiles`, `weekly_metrics`, `check_ins`, `workout_plans`, `exercise_logs`, `meal_plans`, `recipes`, `user_pantry`
- `services/recovery-assessment.ts` — pure algo, gets wrapped as a Trainer tool helper
- `services/photo-analyzer.ts` — wrapped as `get_photo_analysis` tool implementation
- Auth middleware, error handler, migration runner

### What gets retired or refactored
- `services/plan-generator.ts` — replaced by Trainer agent loop with tools
- `services/narrative-generator.ts` — folded into Trainer's check-in response
- `services/meal-generator.ts` + `gemini-nutritionist.ts` — moved behind `consult_dietician` tool, eventually become Dietician agent in later spec
- `services/garmin-parser.ts` — deprecated once Apple Health is the source of truth (kept as fallback during migration)
- All current `routes/*.ts` — replaced by an agent invocation endpoint + thin wrappers

### What gets added
- `server/src/agents/trainer/` — system prompt, tool definitions, agent loop runner
- `server/src/agents/shared/` — agent loop infrastructure (tool registration, schema validation, memory load/save, observability)
- `server/src/scheduler/` — cron-driven engagement scheduler that calls `decide_to_message`
- `server/src/healthkit/` — endpoints for iOS to push HealthKit data
- New table: `trainer_memory`
- New table: `training_blocks` (block_id, user_id, weeks, theme, focus_areas, intent_reasoning, status)
- New table: `workout_modifications` (modification_id, user_id, session_id, type, payload, created_at)

## Implementation steps (ordered)

1. **Agent loop infrastructure** (`agents/shared/`)
   - Tool registration system
   - Anthropic SDK tool-use loop runner
   - Zod schema validation for inputs/outputs
   - Memory load/save helpers
   - Observability (log every tool call, every loop iteration, every response)

2. **Trainer-specific code** (`agents/trainer/`)
   - System prompt (above) as a `.md` file loaded at runtime
   - Tool implementations (each tool ~ a function)
   - Invocation type handlers (onboarding, check_in, post_workout, etc.)

3. **DB migrations**
   - `trainer_memory` table
   - `training_blocks` table
   - `workout_modifications` table

4. **Agent invocation endpoint**
   - `POST /api/agents/trainer/invoke` accepting `Invocation`, returning `TrainerResponse`
   - Auth-protected (existing middleware)

5. **Tool implementations** — port existing service code where possible
   - Especially: `get_photo_analysis` (port from `photo-analyzer.ts`), `consult_dietician` (wrap current Gemini + meal-generator chain)

6. **Engagement scheduler**
   - Cron runner (every hour or so)
   - For each user: assemble context → call Trainer with `mid_week_pulse` or `re_engagement` → handle response

7. **Validation harness**
   - Replay current Crea check-ins through new agent → compare outputs
   - Manually inspect 5–10 invocations for voice/quality

8. **Cutover**
   - Old `/api/checkin/submit` route either deprecated or routed through new agent
   - Dashboard for observability (optional but valuable)

## Files to create / modify

**Create:**
- `server/src/agents/trainer/system-prompt.md`
- `server/src/agents/trainer/index.ts`
- `server/src/agents/trainer/tools/*.ts` (one file per tool)
- `server/src/agents/shared/loop.ts`
- `server/src/agents/shared/memory.ts`
- `server/src/agents/shared/observability.ts`
- `server/src/scheduler/index.ts`
- `server/drizzle/migrations/<n>_trainer_memory.sql`
- `server/drizzle/migrations/<n+1>_training_blocks.sql`
- `server/drizzle/migrations/<n+2>_workout_modifications.sql`
- `server/src/routes/agents.ts`

**Modify:**
- `server/src/index.ts` — mount new `agents` router, register scheduler
- `server/src/db/schema.ts` — add new tables

**Reference (existing, to wrap or port):**
- `server/src/services/ai-generate.ts` — model invocation primitive (wrap into loop runner)
- `server/src/services/photo-analyzer.ts` — port body of function into `get_photo_analysis` tool
- `server/src/services/recovery-assessment.ts` — keep as helper called from a tool

## Verification

End-to-end: a real check-in invocation succeeds, produces a sensible plan, writes memory, and the agent loop logs each tool call.

Concrete steps:

1. Apply migrations: `cd server && npm run db:migrate`
2. Start server: `cd server && npm run dev`
3. POST a synthetic onboarding invocation:
   ```
   POST /api/agents/trainer/invoke
   {
     "invocation_type": "onboarding",
     "user_id": 1,
     "trigger_payload": { ...test profile... }
   }
   ```
4. Confirm response matches `TrainerResponse` schema, includes a `proposals[]` with one `training_block` proposal.
5. Inspect `trainer_memory` table — should have `last_block_intent_reasoning` row.
6. Inspect observability log — should show tool calls in order: `get_user_profile`, `get_health_baseline`, `get_cycle_status`, `propose_training_block`, `respond_to_user`.
7. POST a synthetic check_in invocation; confirm same end-to-end flow with the check-in payload.
8. Replay one of Jessica's prior real check-ins through the new agent; eyeball the output for voice + reasoning quality.

Spec A is done when:
- The Trainer agent runs end-to-end via tools
- Memory persists between invocations
- Output validates against Zod schema
- Voice matches the system prompt (no generic encouragement, references real data)
- A check-in produces an equivalent or better plan than today's pipeline

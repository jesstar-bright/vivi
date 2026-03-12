# Crea AI Backend — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the backend API that powers Crea's intelligent training — parsing Garmin emails for health metrics, analyzing progress photos with Claude Vision, and generating personalized weekly workout plans.

**Architecture:** Node.js + Hono API server with PostgreSQL for storage, Cloudflare R2 for photo uploads, and Claude API for all intelligence (email parsing, photo analysis, workout generation). Single-user system with simple token auth.

**Tech Stack:** Node.js, Hono, PostgreSQL, Cloudflare R2 (S3-compatible), Claude API (@anthropic-ai/sdk), Claude Gmail integration

**Spec:** `docs/specs/2026-03-12-ai-backend-spec.md`

---

## Chunk 1: Project Scaffolding & Database

### Task 1: Initialize the backend project

**Files:**
- Create: `server/package.json`
- Create: `server/tsconfig.json`
- Create: `server/.env.example`
- Create: `server/.gitignore`

- [ ] **Step 1: Create server directory and initialize**

```bash
cd /Users/jessicatalbert/Projects/vivi
mkdir -p server
cd server
npm init -y
```

- [ ] **Step 2: Install dependencies**

```bash
npm install hono @hono/node-server @anthropic-ai/sdk pg drizzle-orm dotenv
npm install -D typescript @types/node @types/pg drizzle-kit tsx
```

- [ ] **Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "outDir": "dist",
    "rootDir": "src",
    "declaration": true
  },
  "include": ["src"]
}
```

- [ ] **Step 4: Create .env.example**

```
DATABASE_URL=postgres://user:password@localhost:5432/crea
ANTHROPIC_API_KEY=sk-ant-...
API_TOKEN=your-secret-token-here
PORT=3001

# Added in Task 5 (photo upload):
# R2_ACCOUNT_ID=
# R2_ACCESS_KEY_ID=
# R2_SECRET_ACCESS_KEY=
# R2_BUCKET_NAME=crea-photos
```

- [ ] **Step 5: Create server/.gitignore**

```
node_modules/
dist/
.env
```

- [ ] **Step 6: Update root .gitignore**

Add `server/node_modules/` and `server/dist/` to the root `.gitignore`.

- [ ] **Step 7: Commit**

```bash
git add server/ .gitignore
git commit -m "feat: scaffold backend project with dependencies"
```

---

### Task 2: Define database schema with Drizzle

**Files:**
- Create: `server/src/db/schema.ts`
- Create: `server/src/db/index.ts`
- Create: `server/drizzle.config.ts`

- [ ] **Step 1: Write schema**

`server/src/db/schema.ts` — Define all 5 tables from the spec:
- `user_profiles` — single row for Jessica's profile (start_date, height, conditions, goal_weight, current_weight, post_op_date, post_op_cleared)
- `weekly_metrics` — one row per day (date, rhr, hrv, sleep_score, sleep_hours, body_battery, steps, vigorous_minutes, stress_avg, weight)
- `check_ins` — one row per week (week_number, date, photo_url, photo_analysis JSON, self_report_energy, self_report_motivation, self_report_notes, mode_decision, mode_reasoning, trainer_message)
- `workout_plans` — one row per week (week_number, mode, plan_json, nutrition_json, focus_areas, generated_at)
- `exercise_logs` — one row per completed exercise (date, exercise_name, suggested_weight, actual_weight_used, sets_completed, reps_completed, weight_rating, notes)

Use Drizzle ORM with `pgTable` definitions. Use `jsonb` for plan_json, nutrition_json, photo_analysis, and focus_areas columns. Use `text` enum for mode_decision ('push'|'maintain'|'rampup') and weight_rating ('good'|'too_heavy'|'too_light'|'incomplete').

- [ ] **Step 2: Write db connection**

`server/src/db/index.ts` — Export a `db` instance using `drizzle(pool)` with the `DATABASE_URL` env var.

- [ ] **Step 3: Write drizzle config**

`server/drizzle.config.ts` — Point at schema file, use `DATABASE_URL` for connection.

- [ ] **Step 4: Generate and run migration**

```bash
cd server
npx drizzle-kit generate
npx drizzle-kit push
```

- [ ] **Step 5: Seed user profile**

Create `server/src/db/seed.ts` that inserts Jessica's initial profile row:
- start_date: '2026-03-09'
- conditions: 'PCOS, Mirena IUD'
- goal_weight: 140
- current_weight: 152
- post_op_date: '2026-03-09'
- post_op_cleared: false

Run with: `npx tsx src/db/seed.ts`

- [ ] **Step 6: Commit**

```bash
git add server/src/db/ server/drizzle.config.ts
git commit -m "feat: define database schema and seed user profile"
```

---

### Task 3: API server with health check and auth middleware

**Files:**
- Create: `server/src/index.ts`
- Create: `server/src/middleware/auth.ts`

- [ ] **Step 1: Write auth middleware**

`server/src/middleware/auth.ts` — Simple bearer token check against `API_TOKEN` env var. Returns 401 if missing/wrong. Single-user system, no JWT complexity.

- [ ] **Step 2: Write shared utilities**

Create `server/src/utils.ts`:
- `computeCurrentWeek(startDate: Date): number` — `Math.ceil((today - startDate) / (7 * 86400000))`, capped at 12 (returns 12 for week 13+, new cycle logic deferred)
- `loadTrainerInstructions(): string` — reads and caches `docs/TRAINER_INSTRUCTIONS.md` content at startup, shared across services
- Standard error response type: `{ error: string, code: string }`

- [ ] **Step 3: Write Hono error handler middleware**

Add to `server/src/middleware/error-handler.ts` — catches thrown errors and returns consistent `{ error, code }` JSON responses. Logs errors server-side.

- [ ] **Step 4: Write server entry point**

`server/src/index.ts` — Hono app with:
- CORS middleware (allow prototype origin)
- Error handler middleware
- Auth middleware on all `/api/*` routes
- `GET /health` — returns `{ status: 'ok', week: N }` using `computeCurrentWeek()`
- Start on `PORT` env var (default 3001)

- [ ] **Step 3: Add start script to package.json**

```json
"scripts": {
  "dev": "tsx watch src/index.ts",
  "build": "tsc",
  "start": "node dist/index.js"
}
```

- [ ] **Step 4: Test manually**

```bash
cd server && npm run dev
# In another terminal:
curl http://localhost:3001/health
curl -H "Authorization: Bearer your-secret-token-here" http://localhost:3001/api/health
```

- [ ] **Step 5: Commit**

```bash
git add server/src/index.ts server/src/middleware/ server/package.json
git commit -m "feat: API server with health check and auth middleware"
```

---

## Chunk 2: Garmin Email Parsing & Metrics

### Task 4: Garmin email parser using Claude

**Files:**
- Create: `server/src/services/garmin-parser.ts`
- Create: `server/src/routes/metrics.ts`

- [ ] **Step 1: Write Gmail email fetcher**

Add to `server/src/services/garmin-parser.ts` — A function `fetchLatestGarminEmail()` that:
1. Uses Claude's Gmail integration to search for the most recent Garmin weekly summary email (search query: `from:noreply@garmin.com subject:"weekly" newer_than:7d`)
2. Returns the email body text, or `null` if no recent email found

- [ ] **Step 2: Write the Garmin email parsing service**

Add to `server/src/services/garmin-parser.ts` — A function `parseGarminEmail(emailContent: string)` that:
1. Takes raw email text from a Garmin weekly summary
2. Sends it to Claude API with a system prompt instructing it to extract structured metrics
3. Returns typed JSON:

```typescript
interface GarminMetrics {
  date_range: { start: string; end: string };
  daily_metrics: Array<{
    date: string;
    rhr: number | null;
    hrv: number | null;
    sleep_score: number | null;
    sleep_hours: number | null;
    body_battery: number | null;
    steps: number | null;
    vigorous_minutes: number | null;
    stress_avg: number | null;
  }>;
  weekly_averages: {
    rhr: number;
    hrv: number;
    sleep_score: number;
    sleep_hours: number;
    body_battery: number;
    steps: number;
    vigorous_minutes: number;
    stress_avg: number;
  };
}
```

Use `@anthropic-ai/sdk` with `model: 'claude-sonnet-4-6'` and structured JSON output via system prompt.

- [ ] **Step 3: Write the metrics routes**

`server/src/routes/metrics.ts` — Hono router with:
- `GET /api/metrics/weekly` — returns the most recent week's aggregated metrics from the database
- `GET /api/metrics/history` — returns metrics for the last N weeks (default 12), with weekly averages and trends (week-over-week delta)
- `POST /api/metrics/parse-email` — accepts `{ email_content: string }`, runs the parser, stores results in `weekly_metrics` table, returns parsed data
- `POST /api/metrics/fetch-from-gmail` — calls `fetchLatestGarminEmail()`, if found runs it through `parseGarminEmail()`, stores results, returns parsed data. If no email found, returns `{ error: "No recent Garmin email found", code: "NO_GARMIN_EMAIL" }` with 404 status

- [ ] **Step 4: Register routes in main app**

Add metrics router to `server/src/index.ts`.

- [ ] **Step 5: Test with a sample Garmin email**

Create `server/test-data/sample-garmin-email.txt` with a realistic Garmin weekly summary. Test the parsing endpoint:

```bash
curl -X POST http://localhost:3001/api/metrics/parse-email \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{"email_content": "..."}'
```

- [ ] **Step 6: Commit**

```bash
git add server/src/services/garmin-parser.ts server/src/routes/metrics.ts server/test-data/
git commit -m "feat: Garmin email parser with Gmail fetch + metrics endpoints"
```

---

## Chunk 3: Photo Analysis

### Task 5: Photo upload and storage

**Files:**
- Create: `server/src/services/photo-storage.ts`
- Create: `server/src/routes/checkin.ts`

- [ ] **Step 1: Write photo storage service**

`server/src/services/photo-storage.ts` — Functions for:
- `uploadPhoto(buffer: Buffer, filename: string): Promise<string>` — uploads to R2, returns the object key (NOT a public URL)
- `getPhotoBuffer(key: string): Promise<Buffer>` — retrieves photo for sending to Claude

Use `@aws-sdk/client-s3` (R2 is S3-compatible). Configure with R2 env vars.

- [ ] **Step 2: Install S3 SDK**

```bash
cd server && npm install @aws-sdk/client-s3
```

- [ ] **Step 3: Write check-in routes (photo upload)**

`server/src/routes/checkin.ts` — Hono router with:
- `POST /api/checkin/photo` — accepts multipart form upload, stores in R2, returns `{ success: true, photo_key: "..." }`
- Photo is stored as `progress-photos/checkin-YYYY-MM-DD.{ext}`
- Returns 400 if no file attached

- [ ] **Step 4: Register routes**

Add checkin router to main app.

- [ ] **Step 5: Test upload**

```bash
curl -X POST http://localhost:3001/api/checkin/photo \
  -H "Authorization: Bearer your-token" \
  -F "photo=@/path/to/test-image.jpg"
```

- [ ] **Step 6: Commit**

```bash
git add server/src/services/photo-storage.ts server/src/routes/checkin.ts
git commit -m "feat: photo upload to R2 storage"
```

---

### Task 6: Photo analysis with Claude Vision

**Files:**
- Create: `server/src/services/photo-analyzer.ts`

- [ ] **Step 1: Write photo analysis service**

`server/src/services/photo-analyzer.ts` — Function `analyzeProgressPhoto(params)` that:
1. Takes: current photo buffer, previous photo buffer (optional), goal reference images (loaded from disk)
2. Builds a Claude Vision request with:
   - System prompt containing the analysis protocol from `TRAINER_INSTRUCTIONS.md` (loaded at startup)
   - Current progress photo as image
   - Previous progress photo as image (if available)
   - Goal reference images as images
3. Requests structured JSON output matching the spec's photo analysis schema
4. Returns the typed analysis object

Use `model: 'claude-opus-4-6'` for photo analysis (higher quality visual reasoning).

Goal reference images are loaded from `docs/body-reference/` at service init time.

- [ ] **Step 2: Test with baseline photo**

Write a quick test script `server/scripts/test-photo-analysis.ts` that:
1. Loads the baseline photo from `docs/progress-photos/`
2. Runs it through the analyzer
3. Prints the JSON result

```bash
npx tsx scripts/test-photo-analysis.ts
```

- [ ] **Step 3: Commit**

```bash
git add server/src/services/photo-analyzer.ts server/scripts/
git commit -m "feat: photo analysis service with Claude Vision"
```

---

## Chunk 4: Check-In Engine & Plan Generation

### Task 7: Recovery assessment logic

**Files:**
- Create: `server/src/services/recovery-assessment.ts`

- [ ] **Step 1: Write recovery assessment**

`server/src/services/recovery-assessment.ts` — Pure function `assessRecovery(params)` that:

Takes:
- `weeklyMetrics` — 7-day averages from Garmin
- `selfReport` — energy (1-5), motivation (1-5)
- `weekNumber` — current program week
- `postOpCleared` — boolean

Returns:
- `mode`: 'push' | 'maintain' | 'rampup'
- `reasoning`: string explaining the decision

Logic (from spec):
- If `weekNumber <= 3 && !postOpCleared` → rampup
- If `sleep_avg < 6.5` → maintain
- If `body_battery_avg < 30` → maintain
- If `hrv` trending down (>15% drop from prior week) → maintain
- If `stress_avg > 60` → maintain
- If `selfReport.energy < 3` → maintain
- Otherwise → push

This is pure logic with no API calls — easy to test.

- [ ] **Step 2: Write unit tests**

Create `server/src/services/__tests__/recovery-assessment.test.ts` with test cases:
- Post-op + not cleared → rampup
- Sleep avg < 6.5 → maintain
- Body battery avg < 30 → maintain
- HRV drop > 15% from prior week → maintain
- Stress avg > 60 → maintain
- Energy self-report < 3 → maintain
- All signals green → push
- Multiple maintain triggers → maintain (with combined reasoning)

Run: `npx vitest run src/services/__tests__/recovery-assessment.test.ts`

- [ ] **Step 3: Install vitest**

```bash
npm install -D vitest
```

Add to package.json scripts: `"test": "vitest run"`

- [ ] **Step 4: Commit**

```bash
git add server/src/services/recovery-assessment.ts server/src/services/__tests__/
git commit -m "feat: recovery assessment logic with unit tests"
```

---

### Task 8: Workout plan generation with Claude

**Files:**
- Create: `server/src/services/plan-generator.ts`

- [ ] **Step 1: Write plan generator**

`server/src/services/plan-generator.ts` — Function `generateWeeklyPlan(params)` that:

Takes:
- `mode` — push/maintain/rampup
- `weekNumber` — current week
- `focusAreas` — from photo analysis (e.g., ['core', 'arms'])
- `exerciseHistory` — last 4 weeks of exercise logs (for rotation + weight suggestions)
- `trainerInstructions` — loaded from `TRAINER_INSTRUCTIONS.md`
- `userProfile` — conditions, restrictions

Sends a structured prompt to Claude (`claude-sonnet-4-6`) that includes:
- The trainer persona and instructions
- Current mode and what it means for volume/intensity
- Focus areas and how to weight them
- Exercise history (to rotate and suggest weights)
- User profile (PCOS, post-op status, schedule — Sunday tennis)
- Required JSON output format matching the spec's plan structure

Returns the full 7-day plan JSON + nutrition targets + trainer message.

- [ ] **Step 2: Test plan generation**

Write `server/scripts/test-plan-generation.ts` that generates a sample Push week plan with focus on core + arms. Print the result.

```bash
npx tsx scripts/test-plan-generation.ts
```

- [ ] **Step 3: Commit**

```bash
git add server/src/services/plan-generator.ts server/scripts/
git commit -m "feat: workout plan generation with Claude"
```

---

### Task 9: Full check-in submission flow

**Files:**
- Modify: `server/src/routes/checkin.ts`

- [ ] **Step 1: Add check-in submission endpoint**

Add `POST /api/checkin/submit` to `server/src/routes/checkin.ts`. This is the main orchestration endpoint that:

1. Accepts: `{ energy: number, motivation: number, notes: string, photo_key?: string, manual_metrics?: object }`
2. Computes current week number using `computeCurrentWeek()` from utils
3. Fetches weekly metrics from database. If none exist:
   a. Attempt `fetchLatestGarminEmail()` → parse → store
   b. If no Garmin email found and no `manual_metrics` provided, return `{ needs_metrics: true, message: "No Garmin data found for this week. Please provide metrics manually or check that Garmin sent your weekly email." }` with 422 status
   c. If `manual_metrics` provided, use those instead
4. If `photo_key` provided, runs photo analysis (fetch from R2 → Claude Vision)
5. Runs recovery assessment (metrics + self-report → push/maintain/rampup)
6. Generates workout plan (mode + focus areas + history → Claude)
7. Stores everything in database: check_in row + workout_plan row
8. Returns: `{ mode, trainer_message, plan_summary }`

- [ ] **Step 2: Add get check-in endpoint**

Add `GET /api/checkin/:week` — returns the stored check-in data + plan for that week.

- [ ] **Step 3: Test the full flow**

```bash
# First, parse a Garmin email to populate metrics
curl -X POST .../api/metrics/parse-email ...

# Then submit check-in
curl -X POST http://localhost:3001/api/checkin/submit \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{"energy": 4, "motivation": 5, "notes": "Feeling good this week"}'
```

- [ ] **Step 4: Commit**

```bash
git add server/src/routes/checkin.ts
git commit -m "feat: full check-in submission flow with plan generation"
```

---

## Chunk 5: Plan Serving & Workout Logging

### Task 10: Plan endpoints

**Files:**
- Create: `server/src/routes/plans.ts`

- [ ] **Step 1: Write plan routes**

`server/src/routes/plans.ts` — Hono router with:
- `GET /api/plan/current` — computes current week using `computeCurrentWeek()`, returns that week's plan from database. If no plan exists:
  - If current week is more than 1 week ahead of the latest plan (missed check-in), auto-generate a Maintain plan using the plan generator with safe defaults (no photo analysis, default focus areas) — per spec: "If the user misses a check-in, the system generates a Maintain week by default"
  - Otherwise returns `{ needs_checkin: true }`
- `GET /api/plan/:week` — returns a specific week's plan
- `GET /api/plan/history` — returns all generated plans (week_number, mode, generated_at, focus_areas)

- [ ] **Step 2: Register routes and test**

- [ ] **Step 3: Commit**

```bash
git add server/src/routes/plans.ts
git commit -m "feat: plan serving endpoints"
```

---

### Task 11: Workout completion logging

**Files:**
- Create: `server/src/routes/workouts.ts`

- [ ] **Step 1: Write workout logging routes**

`server/src/routes/workouts.ts` — Hono router with:
- `POST /api/workout/complete` — accepts array of exercise logs:

```typescript
{
  date: string,
  exercises: Array<{
    exercise_name: string,
    suggested_weight: string,
    actual_weight_used: string,
    sets_completed: number,
    reps_completed: string,
    weight_rating: 'good' | 'too_heavy' | 'too_light' | 'incomplete',
    notes?: string
  }>
}
```

Stores each exercise as a row in `exercise_logs` table.

- `GET /api/workout/history/:exercise` — returns weight progression for a specific exercise (for the plan generator to make smart suggestions)

- [ ] **Step 2: Register routes and test**

- [ ] **Step 3: Commit**

```bash
git add server/src/routes/workouts.ts
git commit -m "feat: workout completion logging with weight ratings"
```

---

## Chunk 6: Progress Summary & Frontend Connection

### Task 12: Progress summary endpoint

**Files:**
- Create: `server/src/routes/progress.ts`

- [ ] **Step 1: Write progress route**

`server/src/routes/progress.ts` — Hono router with:
- `GET /api/progress/summary` — returns:
  - Current week number and phase (Ramp-Up/Foundation/Intensify/Peak)
  - Weight trend (weekly entries)
  - Fitness age estimate (derived from metrics trends)
  - Workout adherence (completed vs planned per week)
  - Top improving muscle groups (from photo analysis history)
  - Current vs goal metrics

- [ ] **Step 2: Commit**

```bash
git add server/src/routes/progress.ts
git commit -m "feat: progress summary endpoint"
```

---

### Task 13: Connect prototype frontend to API

**Files:**
- Modify: `prototype/index.html`

- [ ] **Step 1: Add API client**

Add a small JS module at the bottom of `prototype/index.html` that:
- Defines `API_BASE` (defaults to `http://localhost:3001`)
- Defines `API_TOKEN` (from a prompt or localStorage)
- Provides `apiGet(path)` and `apiPost(path, body)` helper functions
- Handles auth headers automatically

- [ ] **Step 2: Load current plan from API**

On page load, call `GET /api/plan/current`. If a plan exists:
- Replace the hardcoded `programData` with the API response
- Update the week counter in the header
- Set the mode (push/maintain/rampup) from the plan

If no plan exists (`needs_checkin: true`), show a prompt in the Check-In tab.

- [ ] **Step 3: Wire up check-in submission**

In the Check-In tab:
- Photo upload calls `POST /api/checkin/photo`
- Submit button calls `POST /api/checkin/submit` with self-report data
- On success, refresh the plan and show the trainer message

- [ ] **Step 4: Wire up workout completion**

Add a "Complete Workout" flow:
- After viewing a day's workout, user can tap "Log Workout"
- For each exercise, input actual weight + rating
- Calls `POST /api/workout/complete`

- [ ] **Step 5: Test end-to-end**

1. Start server: `cd server && npm run dev`
2. Open prototype in browser
3. Submit a check-in → verify plan loads
4. Complete a workout → verify it logs

- [ ] **Step 6: Commit**

```bash
git add prototype/index.html
git commit -m "feat: connect frontend prototype to backend API"
```

---

## Task Dependencies

```
Task 1 (scaffold) → Task 2 (schema) → Task 3 (server + auth)
                                              ↓
                    Task 4 (Garmin parser) ←───┘
                    Task 5 (photo upload)  ←───┘
                    Task 6 (photo analysis) ← Task 5
                    Task 7 (recovery logic) — no deps (pure logic)
                              ↓
                    Task 8 (plan generator) — needs Task 7
                              ↓
                    Task 9 (check-in flow) — needs Tasks 4, 6, 7, 8
                              ↓
                    Task 10 (plan endpoints) ← Task 9
                    Task 11 (workout logging) — can parallel with 10
                              ↓
                    Task 12 (progress summary) ← Tasks 10, 11
                    Task 13 (frontend connection) ← Tasks 10, 11, 12
```

**Parallelizable:** Tasks 4, 5, 7 can all be built simultaneously after Task 3.

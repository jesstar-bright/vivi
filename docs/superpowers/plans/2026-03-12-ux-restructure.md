# Crea UX Restructure Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the Crea prototype from 3 tabs to 3 tabs + 1 modal (Workouts, Lifestyle, Progress, Sunday Check-In Modal) per the UX audit spec.

**Architecture:** Backend-first approach — add new API endpoints and schema changes, then rebuild the frontend prototype to consume them. The prototype is a single HTML file with embedded CSS/JS served by Hono.

**Tech Stack:** Hono (Node.js), Drizzle ORM, PostgreSQL, Claude API (Anthropic SDK), single-file HTML prototype

**Spec:** `docs/superpowers/specs/2026-03-12-ux-restructure-design.md`

---

## Chunk 1: Schema & Backend Changes

### Task 1: Add `progressNarrative` column to `workoutPlans` table

**Files:**
- Modify: `server/src/db/schema.ts:43-51`

- [ ] **Step 1: Add column to schema**

In `server/src/db/schema.ts`, add `progressNarrative` to the `workoutPlans` table:

```typescript
export const workoutPlans = pgTable('workout_plans', {
  id: serial('id').primaryKey(),
  weekNumber: integer('week_number').notNull(),
  mode: text('mode').notNull(),
  planJson: jsonb('plan_json').notNull(),
  nutritionJson: jsonb('nutrition_json'),
  focusAreas: jsonb('focus_areas'),
  progressNarrative: text('progress_narrative'),
  generatedAt: timestamp('generated_at').defaultNow(),
});
```

- [ ] **Step 2: Push schema to database**

Run: `cd /Users/jessicatalbert/Projects/vivi/server && npx drizzle-kit push`
Expected: Table altered, column added

- [ ] **Step 3: Commit**

```bash
git add server/src/db/schema.ts
git commit -m "schema: add progressNarrative column to workoutPlans"
```

---

### Task 2: Create narrative generator service

**Files:**
- Create: `server/src/services/narrative-generator.ts`

- [ ] **Step 1: Write the narrative generator**

```typescript
import Anthropic from '@anthropic-ai/sdk';
import { loadTrainerInstructions } from '../utils.js';

export interface NarrativeInput {
  weekNumber: number;
  mode: string;
  // Garmin trends
  currentMetrics: { rhr: number; hrv: number; sleepHours: number; stressAvg: number };
  firstWeekMetrics: { rhr: number; hrv: number; sleepHours: number; stressAvg: number } | null;
  // Strength gains
  strengthGains: Array<{ exercise: string; currentWeight: number; startWeight: number }>;
  // Check-in history
  modeHistory: Array<{ week: number; mode: string }>;
  energyAvg: number | null;
  motivationAvg: number | null;
}

export async function generateProgressNarrative(input: NarrativeInput): Promise<string> {
  const client = new Anthropic();
  const trainerInstructions = loadTrainerInstructions();

  const metricsContext = input.firstWeekMetrics
    ? `Metric trends (Week 1 → now):
- Resting HR: ${input.firstWeekMetrics.rhr} → ${input.currentMetrics.rhr} bpm
- HRV: ${input.firstWeekMetrics.hrv} → ${input.currentMetrics.hrv} ms
- Sleep: ${input.firstWeekMetrics.sleepHours} → ${input.currentMetrics.sleepHours} hrs/night
- Stress: ${input.firstWeekMetrics.stressAvg} → ${input.currentMetrics.stressAvg}`
    : `Current metrics: RHR ${input.currentMetrics.rhr}, HRV ${input.currentMetrics.hrv}, Sleep ${input.currentMetrics.sleepHours} hrs, Stress ${input.currentMetrics.stressAvg}`;

  const strengthContext = input.strengthGains.length > 0
    ? `Strength gains:\n${input.strengthGains.map(g => `- ${g.exercise}: ${g.startWeight} → ${g.currentWeight} lbs (+${g.currentWeight - g.startWeight})`).join('\n')}`
    : 'No exercise logs yet — this is the beginning of her journey.';

  const modeContext = input.modeHistory.length > 0
    ? `Program history: ${input.modeHistory.map(m => `Week ${m.week}: ${m.mode}`).join(', ')}`
    : 'First week of the program.';

  const prompt = `Write a progress narrative for Week ${input.weekNumber}. This goes in the Progress tab of her fitness app.

${metricsContext}

${strengthContext}

${modeContext}

Average energy: ${input.energyAvg ?? 'N/A'}/5, Average motivation: ${input.motivationAvg ?? 'N/A'}/5

RULES:
- Write exactly 3 paragraphs in second person ("Your resting heart rate has dropped...")
- Sound like a trainer talking to her — warm, specific, evidence-based
- Reference specific numbers but weave them into a story, not a report
- End with a forward-looking insight ("Keep protecting your sleep. It's driving everything else.")
- Do NOT use markdown formatting. Plain text only.
- If this is week 1 with limited data, write an encouraging kickoff narrative about what's ahead.

Return ONLY the narrative text. No JSON wrapping, no markdown.`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1000,
    system: trainerInstructions,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0];
  if (text.type !== 'text') {
    throw new Error('Unexpected response type from Claude');
  }

  return text.text.trim();
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /Users/jessicatalbert/Projects/vivi/server && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add server/src/services/narrative-generator.ts
git commit -m "feat: add AI progress narrative generator service"
```

---

### Task 3: Add `GET /api/progress/narrative` endpoint

**Files:**
- Modify: `server/src/routes/progress.ts`

- [ ] **Step 1: Add narrative endpoint**

Add to `server/src/routes/progress.ts` before the export:

Replace the existing import line `import { desc, InferSelectModel } from 'drizzle-orm';` with:

```typescript
import { desc, InferSelectModel } from 'drizzle-orm';
```

(No change needed — the existing import is sufficient for this endpoint.)

Add before the export:

```typescript
// GET /api/progress/narrative — AI-generated progress story
progressRouter.get('/narrative', async (c) => {
  // Get the most recent plan with a narrative
  const [plan] = await db
    .select({
      weekNumber: schema.workoutPlans.weekNumber,
      progressNarrative: schema.workoutPlans.progressNarrative,
      mode: schema.workoutPlans.mode,
      generatedAt: schema.workoutPlans.generatedAt,
    })
    .from(schema.workoutPlans)
    .orderBy(desc(schema.workoutPlans.weekNumber))
    .limit(1);

  if (!plan || !plan.progressNarrative) {
    return c.json({
      narrative: null,
      message: 'No progress narrative yet — complete your first check-in.',
    });
  }

  return c.json({
    week: plan.weekNumber,
    mode: plan.mode,
    narrative: plan.progressNarrative,
    generated_at: plan.generatedAt,
  });
});
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /Users/jessicatalbert/Projects/vivi/server && npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add server/src/routes/progress.ts
git commit -m "feat: add GET /api/progress/narrative endpoint"
```

---

### Task 4: Add `GET /api/progress/strength-gains` endpoint

**Files:**
- Modify: `server/src/routes/progress.ts`

- [ ] **Step 1: Add strength gains endpoint**

Add to `server/src/routes/progress.ts`:

```typescript
// GET /api/progress/strength-gains — per-exercise current weight + delta from start
progressRouter.get('/strength-gains', async (c) => {
  const allLogs: ExerciseLog[] = await db
    .select()
    .from(schema.exerciseLogs)
    .orderBy(desc(schema.exerciseLogs.date));

  if (allLogs.length === 0) {
    return c.json({ gains: [], message: 'No exercise logs yet.' });
  }

  // Group by exercise
  const byExercise = new Map<string, ExerciseLog[]>();
  for (const log of allLogs) {
    const existing = byExercise.get(log.exerciseName) || [];
    existing.push(log);
    byExercise.set(log.exerciseName, existing);
  }

  // Find top exercises by frequency (most logged)
  const sorted = [...byExercise.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 6);

  const gains = sorted.map(([exercise, logs]) => {
    // Current weight = most recent "good" or "too_light" rating
    const goodLogs = logs.filter(l =>
      l.weightRating === 'good' || l.weightRating === 'too_light'
    );
    const currentLog = goodLogs[0]; // already sorted desc by date
    const currentWeight = currentLog
      ? parseFloat(currentLog.actualWeightUsed || currentLog.suggestedWeight || '0')
      : 0;

    // Start weight = oldest log for this exercise
    const oldestLog = logs[logs.length - 1];
    const startWeight = parseFloat(
      oldestLog.actualWeightUsed || oldestLog.suggestedWeight || '0'
    );

    return {
      exercise,
      current_weight: currentWeight,
      start_weight: startWeight,
      change: currentWeight - startWeight,
      sessions: logs.length,
    };
  }).filter(g => g.current_weight > 0);

  return c.json({ gains });
});
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /Users/jessicatalbert/Projects/vivi/server && npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add server/src/routes/progress.ts
git commit -m "feat: add GET /api/progress/strength-gains endpoint"
```

---

### Task 5: Add `GET /api/metrics/trends` endpoint

**Files:**
- Modify: `server/src/routes/metrics.ts`

- [ ] **Step 1: Add trends endpoint**

Add to `server/src/routes/metrics.ts` before the export:

```typescript
// GET /api/metrics/trends — current week avg vs first week avg
metricsRouter.get('/trends', async (c) => {
  // Get all metrics ordered by date
  const allMetrics = await db
    .select()
    .from(schema.weeklyMetrics)
    .orderBy(schema.weeklyMetrics.date);

  if (allMetrics.length === 0) {
    return c.json({ trends: null, message: 'No metrics data yet.' });
  }

  // Split into first 7 days and last 7 days
  const firstWeek = allMetrics.slice(0, Math.min(7, allMetrics.length));
  const lastWeek = allMetrics.slice(-Math.min(7, allMetrics.length));

  const avgOf = (rows: typeof allMetrics, field: keyof typeof allMetrics[0]) => {
    const vals = rows.map(r => r[field] as number | null).filter((v): v is number => v !== null);
    return vals.length > 0 ? +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : null;
  };

  return c.json({
    current: {
      rhr: avgOf(lastWeek, 'rhr'),
      hrv: avgOf(lastWeek, 'hrv'),
      sleep_hours: avgOf(lastWeek, 'sleepHours'),
      stress_avg: avgOf(lastWeek, 'stressAvg'),
    },
    first_week: {
      rhr: avgOf(firstWeek, 'rhr'),
      hrv: avgOf(firstWeek, 'hrv'),
      sleep_hours: avgOf(firstWeek, 'sleepHours'),
      stress_avg: avgOf(firstWeek, 'stressAvg'),
    },
  });
});
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /Users/jessicatalbert/Projects/vivi/server && npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add server/src/routes/metrics.ts
git commit -m "feat: add GET /api/metrics/trends endpoint"
```

---

### Task 6: Simplify `POST /api/workout/complete` request body

**Files:**
- Modify: `server/src/routes/workouts.ts`

The spec requires the user to only provide `exercise_name` and `weight_rating` — the backend fills in weights/sets/reps from the current plan.

- [ ] **Step 1: Update the workout complete endpoint**

Replace the entire `workoutsRouter.post('/complete', ...)` handler in `server/src/routes/workouts.ts`:

```typescript
import { Hono } from 'hono';
import { eq, desc } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import { computeCurrentWeek } from '../utils.js';

const workoutsRouter = new Hono();

// POST /api/workout/complete — simplified: user rates weights, backend fills details from plan
workoutsRouter.post('/complete', async (c) => {
  const body = await c.req.json<{
    exercises: Array<{
      exercise_name: string;
      weight_rating: 'good' | 'too_heavy' | 'too_light' | 'incomplete';
      notes?: string;
    }>;
  }>();

  if (!body.exercises || body.exercises.length === 0) {
    return c.json({ error: 'No exercises provided', code: 'MISSING_EXERCISES' }, 400);
  }

  // Get current plan to look up suggested weights
  const [user] = await db.select().from(schema.userProfiles).limit(1);
  const weekNumber = user ? computeCurrentWeek(new Date(user.startDate)) : 1;

  const [currentPlan] = await db
    .select()
    .from(schema.workoutPlans)
    .where(eq(schema.workoutPlans.weekNumber, weekNumber))
    .limit(1);

  // Build a lookup of exercise -> plan details
  const planExercises = new Map<string, { suggested_weight: string; sets: number; reps: string }>();
  if (currentPlan?.planJson) {
    const plan = currentPlan.planJson as any;
    if (plan.days) {
      for (const day of plan.days) {
        if (day.exercises) {
          for (const ex of day.exercises) {
            planExercises.set(ex.name.toLowerCase(), {
              suggested_weight: ex.suggested_weight || '',
              sets: ex.sets || 0,
              reps: ex.reps || '',
            });
          }
        }
      }
    }
  }

  const dateStr = new Date().toISOString().split('T')[0];

  const inserted = [];
  for (const ex of body.exercises) {
    const planData = planExercises.get(ex.exercise_name.toLowerCase());

    const [row] = await db.insert(schema.exerciseLogs).values({
      date: dateStr,
      exerciseName: ex.exercise_name,
      suggestedWeight: planData?.suggested_weight || null,
      actualWeightUsed: planData?.suggested_weight || null, // default to suggested
      setsCompleted: ex.weight_rating === 'incomplete' ? 0 : (planData?.sets || null),
      repsCompleted: planData?.reps || null,
      weightRating: ex.weight_rating,
      notes: ex.notes || null,
    }).returning();
    inserted.push(row);
  }

  return c.json({ success: true, logged: inserted.length });
});
```

Keep the existing `GET /history/:exercise` handler unchanged.

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /Users/jessicatalbert/Projects/vivi/server && npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add server/src/routes/workouts.ts
git commit -m "feat: simplify workout complete to rating-only input"
```

---

### Task 7: Generate narrative during check-in flow

**Files:**
- Modify: `server/src/routes/checkin.ts:190-222`

- [ ] **Step 1: Import narrative generator and add it to check-in flow**

At the top of `server/src/routes/checkin.ts`, add:

```typescript
import { generateProgressNarrative } from '../services/narrative-generator.js';
```

Then, after the plan is generated (after line 198 `const plan = await generateWeeklyPlan({...});`), add narrative generation:

```typescript
  // 6b. Generate progress narrative
  let progressNarrative: string | null = null;
  try {
    // Get all metrics for trend computation
    const allMetrics = await db
      .select()
      .from(schema.weeklyMetrics)
      .orderBy(schema.weeklyMetrics.date);

    const firstWeekMetrics = allMetrics.length >= 7
      ? (() => {
          const first7 = allMetrics.slice(0, 7);
          const avg = (field: 'rhr' | 'hrv' | 'sleepHours' | 'stressAvg') => {
            const vals = first7.map(r => r[field]).filter((v): v is number => v !== null);
            return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
          };
          return { rhr: avg('rhr'), hrv: avg('hrv'), sleepHours: avg('sleepHours'), stressAvg: avg('stressAvg') };
        })()
      : null;

    const last7 = allMetrics.slice(-Math.min(7, allMetrics.length));
    const avgCurrent = (field: 'rhr' | 'hrv' | 'sleepHours' | 'stressAvg') => {
      const vals = last7.map(r => r[field]).filter((v): v is number => v !== null);
      return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    };

    // Get strength gains
    const allExLogs = await db
      .select()
      .from(schema.exerciseLogs)
      .orderBy(desc(schema.exerciseLogs.date));

    const byExercise = new Map<string, typeof allExLogs>();
    for (const log of allExLogs) {
      const arr = byExercise.get(log.exerciseName) || [];
      arr.push(log);
      byExercise.set(log.exerciseName, arr);
    }

    const strengthGains = [...byExercise.entries()]
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 6)
      .map(([exercise, logs]) => {
        const goodLogs = logs.filter(l => l.weightRating === 'good' || l.weightRating === 'too_light');
        const current = goodLogs[0] ? parseFloat(goodLogs[0].actualWeightUsed || goodLogs[0].suggestedWeight || '0') : 0;
        const oldest = logs[logs.length - 1];
        const start = parseFloat(oldest.actualWeightUsed || oldest.suggestedWeight || '0');
        return { exercise, currentWeight: current, startWeight: start };
      })
      .filter(g => g.currentWeight > 0);

    // Get mode history
    const allCheckIns = await db
      .select({
        weekNumber: schema.checkIns.weekNumber,
        modeDecision: schema.checkIns.modeDecision,
        selfReportEnergy: schema.checkIns.selfReportEnergy,
        selfReportMotivation: schema.checkIns.selfReportMotivation,
      })
      .from(schema.checkIns)
      .orderBy(schema.checkIns.weekNumber);

    const modeHistory = allCheckIns.map(ci => ({ week: ci.weekNumber, mode: ci.modeDecision }));

    // Compute average energy/motivation across all check-ins
    const energyVals = allCheckIns.map(ci => ci.selfReportEnergy).filter((v): v is number => v !== null);
    const motivationVals = allCheckIns.map(ci => ci.selfReportMotivation).filter((v): v is number => v !== null);
    const avgEnergy = energyVals.length > 0 ? +(energyVals.reduce((a, b) => a + b, 0) / energyVals.length).toFixed(1) : null;
    const avgMotivation = motivationVals.length > 0 ? +(motivationVals.reduce((a, b) => a + b, 0) / motivationVals.length).toFixed(1) : null;

    progressNarrative = await generateProgressNarrative({
      weekNumber,
      mode: assessment.mode,
      currentMetrics: {
        rhr: avgCurrent('rhr'),
        hrv: avgCurrent('hrv'),
        sleepHours: avgCurrent('sleepHours'),
        stressAvg: avgCurrent('stressAvg'),
      },
      firstWeekMetrics,
      strengthGains,
      modeHistory,
      energyAvg: avgEnergy,
      motivationAvg: avgMotivation,
    });
  } catch (err) {
    console.error('Narrative generation failed:', err);
    // Non-critical — continue without narrative
  }
```

Then update the `workoutPlans` insert to include the narrative:

```typescript
  await db.insert(schema.workoutPlans).values({
    weekNumber,
    mode: assessment.mode,
    planJson: plan as any,
    nutritionJson: plan.nutrition as any,
    focusAreas: focusAreas as any,
    progressNarrative,
  });
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /Users/jessicatalbert/Projects/vivi/server && npx tsc --noEmit`

- [ ] **Step 3: Test by starting server**

Run: `cd /Users/jessicatalbert/Projects/vivi/server && npx tsx src/index.ts`
Expected: Server starts on port 3001 without errors

- [ ] **Step 4: Commit**

```bash
git add server/src/routes/checkin.ts
git commit -m "feat: generate progress narrative during check-in flow"
```

---

## Chunk 2: Frontend — Tab Structure & Workouts Tab

### Task 8: Restructure tab navigation (3 tabs + modal trigger)

**Files:**
- Modify: `prototype/index.html` (nav section ~lines 947-961)

- [ ] **Step 1: Replace the tab-nav HTML**

Find the `<nav class="tab-nav">` block and replace with:

```html
    <nav class="tab-nav">
        <button class="tab-btn active" data-tab="workouts" onclick="showTab('workouts', this)">
            <span class="tab-icon"><svg viewBox="0 0 24 24"><path d="M20.57 14.86L22 13.43 20.57 12 17 15.57 8.43 7 12 3.43 10.57 2 9.14 3.43 7.71 2 5.57 4.14 4.14 2.71 2.71 4.14l1.43 1.43L2 7.71l1.43 1.43L2 10.57 3.43 12 7 8.43 15.57 17 12 20.57 13.43 22l1.43-1.43L16.29 22l2.14-2.14 1.43 1.43 1.43-1.43-1.43-1.43L22 16.29z"/></svg></span>
            <span>Workouts</span>
        </button>
        <button class="tab-btn" data-tab="lifestyle" onclick="showTab('lifestyle', this)">
            <span class="tab-icon"><svg viewBox="0 0 24 24"><path d="M16 6v8h3v8h2V2c-2.76 0-5 2.24-5 4zm-5 3H9V2H7v7H5V2H3v7c0 2.21 1.79 4 4 4v9h2v-9c2.21 0 4-1.79 4-4V2h-2v7z"/></svg></span>
            <span>Lifestyle</span>
        </button>
        <button class="tab-btn" data-tab="progress" onclick="showTab('progress', this)">
            <span class="tab-icon"><svg viewBox="0 0 24 24"><path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/></svg></span>
            <span>Progress</span>
        </button>
    </nav>
```

- [ ] **Step 2: Update the `showTab` function**

Find `function showTab(tabName)` and replace with:

```javascript
        function showTab(tabName, clickedBtn) {
            document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
            document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
            const tabEl = document.getElementById(tabName + '-tab');
            if (tabEl) tabEl.classList.add('active');
            // Highlight matching nav button via data attribute
            if (clickedBtn) {
                clickedBtn.classList.add('active');
            } else {
                document.querySelector(`.tab-btn[data-tab="${tabName}"]`)?.classList.add('active');
            }
            window.scrollTo(0, 0);
        }
```

- [ ] **Step 3: Commit**

```bash
git add prototype/index.html
git commit -m "ui: restructure tab nav to Workouts, Lifestyle, Progress"
```

---

### Task 9: Strip Workouts tab to day cards only

**Files:**
- Modify: `prototype/index.html` (workouts tab ~lines 964-1045)

- [ ] **Step 1: Remove metrics dashboard, mode toggle, phase banner, and weekly targets from Workouts tab**

Replace the entire `<div id="workouts-tab" class="tab-content active">` content with:

```html
    <div id="workouts-tab" class="tab-content active">
        <!-- Workout Days — primary content -->
        <div id="workout-container"></div>

        <!-- Post-Workout Rating Modal (hidden by default) -->
        <div id="workout-done-modal" style="display:none; position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.5); z-index:2000;">
            <div style="position:absolute; bottom:0; left:0; right:0; background:#fff; border-radius:20px 20px 0 0; padding:24px; max-height:80vh; overflow-y:auto;">
                <div style="font-size:1.1rem; font-weight:700; margin-bottom:4px;">How did the weights feel?</div>
                <div style="font-size:0.8rem; color:#8E8E93; margin-bottom:16px;">Rate each exercise so the AI can adjust next week.</div>
                <div id="workout-rating-list"></div>
                <div style="margin-top:12px;">
                    <div style="font-size:0.78rem; color:#8E8E93; margin-bottom:4px;">Notes (optional)</div>
                    <textarea id="workout-done-notes" placeholder="e.g. shoulder felt tight" style="width:100%; padding:10px; border:1px solid #E5E5EA; border-radius:10px; font-size:0.85rem; resize:none; height:60px; font-family:inherit;"></textarea>
                </div>
                <button onclick="submitWorkoutRatings()" style="width:100%; margin-top:16px; padding:14px; background:linear-gradient(135deg,#f093fb,#f5576c); color:white; border:none; border-radius:12px; font-size:0.95rem; font-weight:600; cursor:pointer;">Submit</button>
                <button onclick="closeWorkoutModal()" style="width:100%; margin-top:8px; padding:10px; background:none; border:none; color:#8E8E93; font-size:0.85rem; cursor:pointer;">Cancel</button>
            </div>
        </div>
    </div>
```

- [ ] **Step 2: Add "I'm Done" button rendering to day cards**

In the `renderAPIPlan` function, replace the entire `plan.days.forEach` loop with:

```javascript
            const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });

            plan.days.forEach((day, index) => {
                const type = day.type || 'strength';
                const badgeClass = type === 'vigorous' ? 'badge-vigorous' :
                                   type === 'strength' ? 'badge-strength' :
                                   type === 'rest' ? 'badge-rest' : 'badge-recovery';
                const isToday = day.day.toLowerCase() === today.toLowerCase();
                const doneBtn = isToday ? `
                    <div style="padding:12px 16px; border-top:1px solid #F2F2F7;">
                        <button onclick="openWorkoutDoneModal(${index})" style="width:100%; padding:12px; background:linear-gradient(135deg,#f093fb,#f5576c); color:white; border:none; border-radius:10px; font-size:0.9rem; font-weight:600; cursor:pointer;">I'm Done ✓</button>
                    </div>` : '';

                html += `
                    <div class="day-card">
                        <div class="day-header ${type}" onclick="toggleDay(${index})">
                            <div class="day-info">
                                <div class="day-title">${day.day}</div>
                                <div class="day-subtitle">${day.title}</div>
                            </div>
                            <div class="day-right">
                                <span class="day-badge ${badgeClass}">${type}</span>
                                <span class="day-duration" style="font-size:0.7rem;color:#8E8E93;">${day.estimated_duration || ''}</span>
                                <span class="arrow" id="arrow-${index}">▼</span>
                            </div>
                        </div>
                        <div class="day-content" id="day-content-${index}">
                            ${renderAPIDayContent(day)}
                        </div>
                        ${doneBtn}
                    </div>
                `;
            });
```

- [ ] **Step 3: Add the workout rating modal JavaScript**

Add these functions to the `<script>` section:

```javascript
        let currentDayExercises = [];

        function openWorkoutDoneModal(dayIndex) {
            // Get exercises for this day from the current plan
            const container = document.getElementById('workout-container');
            const dayCards = container.querySelectorAll('.day-card');
            const exercises = [];

            // Extract exercise names from the rendered day
            const dayContent = document.getElementById('day-content-' + dayIndex);
            if (dayContent) {
                dayContent.querySelectorAll('.exercise-name').forEach(el => {
                    const name = el.textContent.split('(')[0].trim(); // strip weight hint
                    if (name && !name.includes('min') && name.length > 3) {
                        exercises.push(name);
                    }
                });
            }

            currentDayExercises = exercises;
            const list = document.getElementById('workout-rating-list');
            list.innerHTML = exercises.map((name, i) => `
                <div style="padding:10px 0; border-bottom:1px solid #F2F2F7;">
                    <div style="font-size:0.88rem; font-weight:600; margin-bottom:8px;">${name}</div>
                    <div style="display:flex; gap:6px; flex-wrap:wrap;">
                        <button class="rating-btn" data-exercise="${i}" data-rating="good" onclick="selectRating(this)" style="padding:6px 12px; border-radius:20px; border:1px solid #4CAF50; background:none; color:#4CAF50; font-size:0.75rem; cursor:pointer;">Good</button>
                        <button class="rating-btn" data-exercise="${i}" data-rating="too_light" onclick="selectRating(this)" style="padding:6px 12px; border-radius:20px; border:1px solid #5B7FBF; background:none; color:#5B7FBF; font-size:0.75rem; cursor:pointer;">Too Light</button>
                        <button class="rating-btn" data-exercise="${i}" data-rating="too_heavy" onclick="selectRating(this)" style="padding:6px 12px; border-radius:20px; border:1px solid #E5A100; background:none; color:#E5A100; font-size:0.75rem; cursor:pointer;">Too Heavy</button>
                        <button class="rating-btn" data-exercise="${i}" data-rating="incomplete" onclick="selectRating(this)" style="padding:6px 12px; border-radius:20px; border:1px solid #8E8E93; background:none; color:#8E8E93; font-size:0.75rem; cursor:pointer;">Skipped</button>
                    </div>
                </div>
            `).join('');

            document.getElementById('workout-done-modal').style.display = 'block';
        }

        function selectRating(btn) {
            // Deselect siblings
            const exerciseIdx = btn.dataset.exercise;
            document.querySelectorAll(`.rating-btn[data-exercise="${exerciseIdx}"]`).forEach(b => {
                b.style.background = 'none';
                b.style.color = b.style.borderColor;
            });
            // Select this one
            btn.style.background = btn.style.borderColor;
            btn.style.color = 'white';
        }

        async function submitWorkoutRatings() {
            const exercises = currentDayExercises.map((name, i) => {
                const selected = document.querySelector(`.rating-btn[data-exercise="${i}"][style*="color: white"], .rating-btn[data-exercise="${i}"][style*="color:white"]`);
                return {
                    exercise_name: name,
                    weight_rating: selected?.dataset.rating || 'good',
                    notes: '',
                };
            });

            const globalNotes = document.getElementById('workout-done-notes').value;
            if (globalNotes && exercises.length > 0) {
                exercises[0].notes = globalNotes;
            }

            const result = await logWorkoutCompletion(exercises);
            if (result?.success) {
                closeWorkoutModal();
                // Mark day as done visually
                const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
                document.querySelectorAll('.day-header').forEach(header => {
                    if (header.querySelector('.day-title')?.textContent?.toLowerCase() === today.toLowerCase()) {
                        header.style.opacity = '0.6';
                        const btn = header.parentElement.querySelector('button[onclick*="openWorkoutDoneModal"]');
                        if (btn) {
                            btn.textContent = 'Done ✓';
                            btn.style.background = '#4CAF50';
                            btn.disabled = true;
                        }
                    }
                });
            }
        }

        function closeWorkoutModal() {
            document.getElementById('workout-done-modal').style.display = 'none';
        }
```

- [ ] **Step 4: Commit**

```bash
git add prototype/index.html
git commit -m "ui: strip Workouts tab to day cards + post-workout rating modal"
```

---

## Chunk 3: Frontend — Lifestyle Tab

### Task 10: Replace Nutrition tab with Lifestyle tab

**Files:**
- Modify: `prototype/index.html` (nutrition tab ~lines 1048-1143)

- [ ] **Step 1: Replace the nutrition tab HTML**

Replace the entire `<div id="nutrition-tab" class="tab-content">` with:

```html
    <div id="lifestyle-tab" class="tab-content">
        <!-- Nutrition Targets (AI-generated, updates weekly) -->
        <div class="nutrition-card">
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:12px;">
                <svg width="18" height="19" viewBox="0 0 100 100">
                    <defs><linearGradient id="lsg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#f093fb"/><stop offset="100%" style="stop-color:#f5576c"/></linearGradient></defs>
                    <path d="M50 8 L82 38 L50 92 L18 38 Z" fill="url(#lsg)"/>
                </svg>
                <span style="font-size:0.72rem; font-weight:700; color:#f5576c; text-transform:uppercase; letter-spacing:0.8px;">Your Nutrition This Week</span>
            </div>
            <div class="macro-grid" id="lifestyle-macros">
                <div class="macro-item">
                    <div class="macro-value">135g</div>
                    <div class="macro-label">Protein</div>
                </div>
                <div class="macro-item">
                    <div class="macro-value">1,750</div>
                    <div class="macro-label">Calories</div>
                </div>
                <div class="macro-item">
                    <div class="macro-value">80-100 oz</div>
                    <div class="macro-label">Water</div>
                </div>
                <div class="macro-item">
                    <div class="macro-value">Anti-inflammatory</div>
                    <div class="macro-label">Focus</div>
                </div>
            </div>
            <div id="lifestyle-carb-timing" style="margin-top:12px; padding:10px; background:#F7F6F3; border-radius:10px; font-size:0.82rem; color:#6B6B6B; line-height:1.6;">
                Carbs around workouts only — rice, potato, fruit. Anti-inflammatory focus for PCOS.
            </div>
        </div>

        <!-- Sleep Protocol -->
        <div class="sleep-card">
            <div class="sleep-title">Sleep Protocol</div>
            <div id="lifestyle-sleep-target" style="padding:10px; background:#F7F6F3; border-radius:10px; margin-bottom:12px;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-size:0.85rem; color:#3C3C43;">Target</span>
                    <span style="font-size:1rem; font-weight:700; color:#5B7FBF;">7.5 hrs</span>
                </div>
                <div style="font-size:0.75rem; color:#8E8E93; margin-top:4px;">Aim for lights out by 10:00 PM</div>
            </div>
            <div class="sleep-timeline">
                <div class="sleep-item">
                    <span class="sleep-time">7:30 PM</span>
                    <span class="sleep-action">Last meal</span>
                </div>
                <div class="sleep-item">
                    <span class="sleep-time">9:00 PM</span>
                    <span class="sleep-action">Screens off, wind down</span>
                </div>
                <div class="sleep-item">
                    <span class="sleep-time">10:00 PM</span>
                    <span class="sleep-action">Lights out</span>
                </div>
                <div class="sleep-item">
                    <span class="sleep-time">5:30 AM</span>
                    <span class="sleep-action">Wake (7.5 hrs)</span>
                </div>
            </div>
            <div class="sleep-note">
                Poor sleep = high cortisol = fat storage + water retention. With PCOS, this is even more critical.
            </div>
        </div>

        <!-- Grocery & Meal Planning Placeholder -->
        <div style="margin-top:16px; padding:20px; background:#fff; border-radius:16px; text-align:center;">
            <div style="font-size:2rem; margin-bottom:8px;">🛒</div>
            <div style="font-size:0.9rem; font-weight:600; color:#1C1C1E; margin-bottom:4px;">Grocery Lists & Recipes</div>
            <div style="font-size:0.8rem; color:#8E8E93; line-height:1.6;">Coming soon — weekly meal plans and grocery lists based on your nutrition targets. Integrates with Instacart & DoorDash.</div>
        </div>
    </div>
```

- [ ] **Step 2: Update `loadLiveData` to populate Lifestyle tab from plan nutrition**

In `loadLiveData()`, replace the plan check section:

```javascript
            // Load AI-generated plan if available
            if (plan?.plan?.days) {
                renderAPIPlan(plan);
            }

            // Update lifestyle tab nutrition from plan
            if (plan?.plan?.nutrition) {
                const n = plan.plan.nutrition;
                const macros = document.getElementById('lifestyle-macros');
                if (macros) {
                    macros.innerHTML = `
                        <div class="macro-item"><div class="macro-value">${n.protein_g}g</div><div class="macro-label">Protein</div></div>
                        <div class="macro-item"><div class="macro-value">${n.calories?.toLocaleString()}</div><div class="macro-label">Calories</div></div>
                        <div class="macro-item"><div class="macro-value">${n.hydration || '80-100 oz'}</div><div class="macro-label">Water</div></div>
                        <div class="macro-item"><div class="macro-value">${n.focus || 'Anti-inflammatory'}</div><div class="macro-label">Focus</div></div>
                    `;
                }
                const timing = document.getElementById('lifestyle-carb-timing');
                if (timing && n.carb_timing) {
                    timing.textContent = n.carb_timing;
                }
            }
```

- [ ] **Step 3: Remove old `updateNutritionFromPlan` function and its call**

1. Delete the `function updateNutritionFromPlan(nutrition)` function entirely.
2. In `renderAPIPlan`, remove the block that calls it (around line 1453):
```javascript
            // DELETE THIS BLOCK:
            if (plan.nutrition) {
                updateNutritionFromPlan(plan.nutrition);
            }
```

- [ ] **Step 4: Commit**

```bash
git add prototype/index.html
git commit -m "ui: replace Nutrition tab with Lifestyle tab"
```

---

## Chunk 4: Frontend — Progress Tab

### Task 11: Build the Progress tab

**Files:**
- Modify: `prototype/index.html` (replace old checkin tab)

- [ ] **Step 1: Replace the old Check-In tab HTML with Progress tab**

Replace the entire `<div id="checkin-tab" class="tab-content">` with:

```html
    <div id="progress-tab" class="tab-content">
        <!-- AI Progress Narrative -->
        <div style="padding:20px; background:#fff; border-radius:16px;">
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:14px;">
                <svg width="20" height="21" viewBox="0 0 100 100">
                    <defs><linearGradient id="pg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#f093fb"/><stop offset="100%" style="stop-color:#f5576c"/></linearGradient></defs>
                    <path d="M50 8 L82 38 L50 92 L18 38 Z" fill="url(#pg)"/>
                </svg>
                <span style="font-size:0.75rem; font-weight:600; color:#f5576c;">YOUR PROGRESS STORY</span>
                <span style="font-size:0.7rem; color:#AEAEB2; margin-left:auto;" id="narrative-date"></span>
            </div>
            <div id="progress-narrative" style="font-size:0.92rem; line-height:1.85; color:#3C3C43;">
                <div style="color:#8E8E93; font-style:italic;">Complete your first check-in to see your progress story.</div>
            </div>
        </div>

        <!-- What You Can Do Now -->
        <div style="padding:16px; margin-top:10px; background:#fff; border-radius:16px;">
            <div style="font-size:0.72rem; font-weight:700; color:#f093fb; text-transform:uppercase; letter-spacing:0.8px; margin-bottom:12px;">What You Can Do Now</div>
            <div id="strength-gains-list">
                <div style="color:#8E8E93; font-size:0.85rem; font-style:italic;">Log your first workout to see strength gains here.</div>
            </div>
        </div>

        <!-- Under the Surface -->
        <div style="padding:16px; margin-top:10px; background:#fff; border-radius:16px;">
            <div style="font-size:0.72rem; font-weight:700; color:#5B7FBF; text-transform:uppercase; letter-spacing:0.8px; margin-bottom:12px;">Under the Surface</div>
            <div id="metrics-trends-list">
                <div style="color:#8E8E93; font-size:0.85rem; font-style:italic;">Garmin data will appear here after your first week.</div>
            </div>
        </div>

        <!-- Your 12 Weeks -->
        <div style="padding:16px; margin-top:10px; background:#fff; border-radius:16px; margin-bottom:10px;">
            <div style="font-size:0.72rem; font-weight:700; color:#f093fb; text-transform:uppercase; letter-spacing:0.8px; margin-bottom:12px;">Your 12 Weeks</div>
            <div id="journey-bars" style="display:flex; gap:4px; align-items:end;"></div>
            <div style="display:flex; gap:12px; margin-top:10px; justify-content:center;">
                <span style="font-size:0.65rem; color:#E5A100; font-weight:600;">■ Ramp-Up</span>
                <span style="font-size:0.65rem; color:#f5576c; font-weight:600;">■ Push</span>
                <span style="font-size:0.65rem; color:#4CAF50; font-weight:600;">■ Maintain</span>
                <span style="font-size:0.65rem; color:#AEAEB2;">■ Upcoming</span>
            </div>
        </div>
    </div>
```

- [ ] **Step 2: Add Progress tab data loading**

Add a new function `loadProgressTab()` to the script section:

```javascript
        async function loadProgressTab() {
            const [narrative, gains, trends, planHistory] = await Promise.all([
                apiFetch('/api/progress/narrative'),
                apiFetch('/api/progress/strength-gains'),
                apiFetch('/api/metrics/trends'),
                apiFetch('/api/plan/history'),
            ]);

            // Render narrative
            if (narrative?.narrative) {
                const paragraphs = narrative.narrative.split('\n\n').filter(p => p.trim());
                document.getElementById('progress-narrative').innerHTML =
                    paragraphs.map(p => `<div style="margin-bottom:12px;">${p}</div>`).join('');
                const dateEl = document.getElementById('narrative-date');
                if (dateEl && narrative.generated_at) {
                    dateEl.textContent = 'Updated ' + new Date(narrative.generated_at).toLocaleDateString('en-US', { weekday: 'long' });
                }
            }

            // Render strength gains
            if (gains?.gains?.length > 0) {
                document.getElementById('strength-gains-list').innerHTML = gains.gains.map((g, i) => `
                    <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 0; ${i < gains.gains.length - 1 ? 'border-bottom:1px solid #F2F2F7;' : ''}">
                        <span style="font-size:0.88rem; color:#3C3C43;">${g.exercise}</span>
                        <div style="text-align:right;">
                            <span style="font-size:0.95rem; font-weight:700; color:#f5576c;">${g.current_weight} lbs</span>
                            ${g.change > 0 ? `<span style="font-size:0.7rem; color:#4CAF50; margin-left:6px;">↑ ${g.change} lbs</span>` : ''}
                        </div>
                    </div>
                `).join('');
            }

            // Render metric trends
            if (trends?.current) {
                const c = trends.current;
                const f = trends.first_week;
                const items = [
                    { label: 'Resting Heart Rate', value: c.rhr ? Math.round(c.rhr) + ' bpm' : '—', change: f?.rhr && c.rhr ? Math.round(c.rhr - f.rhr) : null, unit: '', lowerIsBetter: true },
                    { label: 'HRV (avg)', value: c.hrv ? Math.round(c.hrv) + ' ms' : '—', change: f?.hrv && c.hrv ? Math.round(((c.hrv - f.hrv) / f.hrv) * 100) : null, unit: '%', lowerIsBetter: false },
                    { label: 'Sleep (avg)', value: c.sleep_hours ? c.sleep_hours.toFixed(1) + ' hrs' : '—', change: f?.sleep_hours && c.sleep_hours ? +(c.sleep_hours - f.sleep_hours).toFixed(1) : null, unit: '', lowerIsBetter: false },
                    { label: 'Stress (avg)', value: c.stress_avg ? Math.round(c.stress_avg) : '—', change: f?.stress_avg && c.stress_avg ? Math.round(c.stress_avg - f.stress_avg) : null, unit: '', lowerIsBetter: true },
                ];

                document.getElementById('metrics-trends-list').innerHTML = items.map((item, i) => {
                    let changeHtml = '';
                    if (item.change !== null && item.change !== 0) {
                        const isGood = item.lowerIsBetter ? item.change < 0 : item.change > 0;
                        const arrow = item.change > 0 ? '↑' : '↓';
                        const color = isGood ? '#4CAF50' : '#E5A100';
                        changeHtml = `<span style="font-size:0.7rem; color:${color}; margin-left:6px;">${arrow} ${Math.abs(item.change)}${item.unit}</span>`;
                    }
                    return `
                        <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 0; ${i < items.length - 1 ? 'border-bottom:1px solid #F2F2F7;' : ''}">
                            <span style="font-size:0.88rem; color:#3C3C43;">${item.label}</span>
                            <div style="text-align:right;">
                                <span style="font-size:0.95rem; font-weight:700; color:#5B7FBF;">${item.value}</span>
                                ${changeHtml}
                            </div>
                        </div>
                    `;
                }).join('');
            }

            // Render 12-week journey bars
            const currentWeek = parseInt(document.querySelector('.week-subtitle')?.textContent?.match(/\d+/)?.[0] || '1');
            const modeMap = {};
            if (planHistory?.plans) {
                planHistory.plans.forEach(p => { modeMap[p.weekNumber] = p.mode; });
            }

            const barsEl = document.getElementById('journey-bars');
            let barsHtml = '';
            for (let w = 1; w <= 12; w++) {
                const mode = modeMap[w] || null;
                const isCurrent = w === currentWeek;
                let bg, height;
                if (!mode) {
                    bg = '#F2F2F7'; height = '20px';
                } else if (mode === 'rampup') {
                    bg = '#E5A100'; height = '32px';
                } else if (mode === 'push') {
                    bg = 'linear-gradient(180deg,#f5576c,#f093fb)'; height = '44px';
                } else {
                    bg = '#4CAF50'; height = '36px';
                }
                const border = isCurrent ? 'border:2px solid #f5576c;' : '';
                const labelColor = isCurrent ? 'color:#f5576c;font-weight:700;' : mode ? 'color:#8E8E93;' : 'color:#AEAEB2;';
                barsHtml += `<div style="flex:1;text-align:center;"><div style="height:${height};background:${bg};border-radius:4px 4px 0 0;${border}"></div><div style="font-size:0.55rem;${labelColor}margin-top:3px;">${w}</div></div>`;
            }
            barsEl.innerHTML = barsHtml;
        }
```

- [ ] **Step 3: Call `loadProgressTab()` from `loadLiveData()`**

At the end of `loadLiveData()`, add:

```javascript
            // Load progress tab data
            loadProgressTab();
```

- [ ] **Step 4: Commit**

```bash
git add prototype/index.html
git commit -m "ui: add Progress tab with AI narrative, strength gains, metrics trends, journey"
```

---

## Chunk 5: Frontend — Sunday Check-In Modal

### Task 12: Build the Sunday Check-In Modal

**Files:**
- Modify: `prototype/index.html`

- [ ] **Step 1: Add modal HTML**

Add this HTML just before the `<nav class="tab-nav">`:

```html
    <!-- Sunday Check-In Modal -->
    <div id="checkin-modal" style="display:none; position:fixed; top:0; left:0; right:0; bottom:0; background:#fff; z-index:3000; overflow-y:auto;">
        <div style="max-width:400px; margin:0 auto; padding:24px;">
            <!-- Step indicator -->
            <div id="checkin-step-indicator" style="display:flex; gap:8px; justify-content:center; margin-bottom:24px;">
                <div class="checkin-dot active" style="width:8px; height:8px; border-radius:50%; background:linear-gradient(135deg,#f093fb,#f5576c);"></div>
                <div class="checkin-dot" style="width:8px; height:8px; border-radius:50%; background:#E5E5EA;"></div>
                <div class="checkin-dot" style="width:8px; height:8px; border-radius:50%; background:#E5E5EA;"></div>
            </div>

            <!-- Step 1: Feelings -->
            <div id="checkin-step-1">
                <div style="text-align:center; margin-bottom:24px;">
                    <svg width="36" height="38" viewBox="0 0 100 100" style="margin-bottom:12px;">
                        <defs><linearGradient id="cmg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#f093fb"/><stop offset="100%" style="stop-color:#f5576c"/></linearGradient></defs>
                        <path d="M50 8 L82 38 L50 92 L18 38 Z" fill="url(#cmg)"/>
                    </svg>
                    <div style="font-size:1.1rem; font-weight:700;">Weekly Check-In</div>
                    <div style="font-size:0.82rem; color:#8E8E93;">Let's see how this week went.</div>
                </div>

                <div style="font-size:0.95rem; font-weight:600; margin-bottom:16px; text-align:center;">Energy this week?</div>
                <div id="energy-buttons" style="display:flex; justify-content:center; gap:12px; margin-bottom:24px;"></div>

                <div style="font-size:0.95rem; font-weight:600; margin-bottom:16px; text-align:center;">Motivation?</div>
                <div id="motivation-buttons" style="display:flex; justify-content:center; gap:12px; margin-bottom:24px;"></div>

                <div style="background:#F7F6F3; border-radius:12px; padding:12px; margin-bottom:16px;">
                    <div style="font-size:0.78rem; color:#8E8E93; margin-bottom:4px;">Anything to note? (optional)</div>
                    <textarea id="checkin-notes" placeholder="e.g. shoulder felt tight Thursday" style="width:100%; border:none; background:none; font-size:0.85rem; resize:none; height:40px; font-family:inherit; outline:none;"></textarea>
                </div>

                <button onclick="checkinGoToStep(2)" style="width:100%; padding:14px; background:linear-gradient(135deg,#f093fb,#f5576c); color:white; border:none; border-radius:12px; font-size:0.95rem; font-weight:600; cursor:pointer;">Next</button>
            </div>

            <!-- Step 2: Photo -->
            <div id="checkin-step-2" style="display:none; text-align:center;">
                <div style="width:80px; height:80px; border-radius:20px; background:#F7F6F3; display:flex; align-items:center; justify-content:center; margin:40px auto 12px; cursor:pointer;" onclick="document.getElementById('checkin-photo-input').click()">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="#AEAEB2"><circle cx="12" cy="12" r="3.2"/><path d="M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"/></svg>
                </div>
                <input type="file" id="checkin-photo-input" accept="image/*" style="display:none" onchange="checkinPhotoSelected(this)">
                <div id="checkin-photo-status" style="font-size:0.88rem; font-weight:600; margin-bottom:4px;">Snap a progress photo</div>
                <div style="font-size:0.78rem; color:#8E8E93; margin-bottom:24px;">Same lighting, same pose. Or upload from camera roll.</div>
                <button onclick="checkinGoToStep(3)" style="width:100%; padding:14px; background:linear-gradient(135deg,#f093fb,#f5576c); color:white; border:none; border-radius:12px; font-size:0.95rem; font-weight:600; cursor:pointer;">Next</button>
                <div onclick="checkinGoToStep(3)" style="margin-top:12px; font-size:0.82rem; color:#f093fb; cursor:pointer;">Skip for now</div>
            </div>

            <!-- Step 3: AI Working / Result -->
            <div id="checkin-step-3" style="display:none; text-align:center; padding-top:60px;">
                <div id="checkin-loading">
                    <svg width="40" height="42" viewBox="0 0 100 100" style="margin-bottom:16px; animation:pulse 1.5s ease-in-out infinite;">
                        <defs><linearGradient id="clg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#f093fb"/><stop offset="100%" style="stop-color:#f5576c"/></linearGradient></defs>
                        <path d="M50 8 L82 38 L50 92 L18 38 Z" fill="url(#clg)"/>
                    </svg>
                    <style>@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.7;transform:scale(0.95)}}</style>
                    <div style="font-size:0.95rem; font-weight:600;">Building your week...</div>
                    <div style="font-size:0.78rem; color:#8E8E93; margin-top:6px; line-height:1.6;">Pulling your Garmin data<br>Analyzing recovery signals<br>Generating your plan</div>
                </div>
                <div id="checkin-result" style="display:none;">
                    <div id="checkin-mode-badge" style="display:inline-block; background:linear-gradient(135deg,#f093fb,#f5576c); color:white; padding:6px 16px; border-radius:20px; font-size:0.8rem; font-weight:700; margin-bottom:12px;"></div>
                    <div id="checkin-result-subtitle" style="font-size:1rem; font-weight:700; margin-bottom:24px;"></div>
                    <div style="display:flex; flex-direction:column; gap:8px;">
                        <button onclick="closeCheckinModal(); showTab('workouts', null);" style="width:100%; padding:14px; background:linear-gradient(135deg,#f093fb,#f5576c); color:white; border:none; border-radius:12px; font-size:0.9rem; font-weight:600; cursor:pointer;">See My Workouts →</button>
                        <button onclick="closeCheckinModal(); showTab('lifestyle', null);" style="width:100%; padding:14px; background:#F7F6F3; color:#1C1C1E; border:none; border-radius:12px; font-size:0.9rem; font-weight:600; cursor:pointer;">See My Lifestyle Plan →</button>
                    </div>
                </div>
            </div>
        </div>
    </div>
```

- [ ] **Step 2: Add modal JavaScript**

```javascript
        // ─── Check-In Modal ──────────────────────────────────────────
        let checkinData = { energy: 3, motivation: 3, notes: '', photoKey: null };

        function initCheckinButtons() {
            ['energy', 'motivation'].forEach(type => {
                const container = document.getElementById(type + '-buttons');
                container.innerHTML = ''; // Clear any existing buttons from prior opens
                for (let i = 1; i <= 5; i++) {
                    const btn = document.createElement('div');
                    btn.style.cssText = 'width:48px;height:48px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1.3rem;cursor:pointer;';
                    btn.style.background = i === 3 ? 'linear-gradient(135deg,#f093fb,#f5576c)' : '#F2F2F7';
                    btn.style.color = i === 3 ? 'white' : '#1C1C1E';
                    btn.style.fontWeight = i === 3 ? '700' : '400';
                    btn.textContent = i;
                    btn.onclick = () => {
                        checkinData[type] = i;
                        container.querySelectorAll('div').forEach(b => {
                            b.style.background = '#F2F2F7';
                            b.style.color = '#1C1C1E';
                            b.style.fontWeight = '400';
                        });
                        btn.style.background = 'linear-gradient(135deg,#f093fb,#f5576c)';
                        btn.style.color = 'white';
                        btn.style.fontWeight = '700';
                    };
                    container.appendChild(btn);
                }
            });
        }

        function openCheckinModal() {
            checkinData = { energy: 3, motivation: 3, notes: '', photoKey: null };
            document.getElementById('checkin-modal').style.display = 'block';
            document.getElementById('checkin-step-1').style.display = 'block';
            document.getElementById('checkin-step-2').style.display = 'none';
            document.getElementById('checkin-step-3').style.display = 'none';
            initCheckinButtons();
            updateCheckinDots(1);
        }

        function closeCheckinModal() {
            // Only called from result CTAs — modal cannot be dismissed mid-flow
            document.getElementById('checkin-modal').style.display = 'none';
        }

        // Note: The modal has no X button or backdrop dismiss — per spec, it blocks until
        // the user completes the check-in and taps one of the result CTAs.

        function updateCheckinDots(step) {
            document.querySelectorAll('.checkin-dot').forEach((dot, i) => {
                dot.style.background = i < step ? 'linear-gradient(135deg,#f093fb,#f5576c)' : '#E5E5EA';
            });
        }

        function checkinGoToStep(step) {
            if (step === 2) {
                checkinData.notes = document.getElementById('checkin-notes').value;
            }
            document.getElementById('checkin-step-1').style.display = step === 1 ? 'block' : 'none';
            document.getElementById('checkin-step-2').style.display = step === 2 ? 'block' : 'none';
            document.getElementById('checkin-step-3').style.display = step === 3 ? 'block' : 'none';
            updateCheckinDots(step);

            if (step === 3) {
                submitCheckinFlow();
            }
        }

        async function checkinPhotoSelected(input) {
            if (input.files && input.files[0]) {
                document.getElementById('checkin-photo-status').textContent = 'Photo selected ✓';
                document.getElementById('checkin-photo-status').style.color = '#4CAF50';
                const key = await uploadProgressPhoto(input.files[0]);
                checkinData.photoKey = key;
            }
        }

        async function submitCheckinFlow() {
            document.getElementById('checkin-loading').style.display = 'block';
            document.getElementById('checkin-result').style.display = 'none';

            const result = await apiFetch('/api/checkin/submit', {
                method: 'POST',
                body: JSON.stringify({
                    energy: checkinData.energy,
                    motivation: checkinData.motivation,
                    notes: checkinData.notes,
                    photo_key: checkinData.photoKey,
                }),
            });

            document.getElementById('checkin-loading').style.display = 'none';
            document.getElementById('checkin-result').style.display = 'block';

            if (result) {
                const mode = result.mode || 'maintain';
                document.getElementById('checkin-mode-badge').textContent = mode.toUpperCase() + ' WEEK';
                document.getElementById('checkin-result-subtitle').textContent =
                    mode === 'push' ? "You're ready to go hard." :
                    mode === 'rampup' ? "Easy does it — building your base." :
                    "Recovery is the priority this week.";
                // Refresh data in background
                loadLiveData();
                loadProgressTab();
            } else {
                document.getElementById('checkin-mode-badge').textContent = 'CHECK-IN FAILED';
                document.getElementById('checkin-result-subtitle').textContent = 'Server may not be running. Try again later.';
            }
        }

        // Check if Sunday check-in is needed on app load — blocks app if pending
        async function checkForPendingCheckin() {
            const plan = await apiFetch('/api/plan/current');
            if (plan?.needs_checkin) {
                // Spec: "Cannot be dismissed until completed. Blocks app usage until done."
                openCheckinModal();
            }
        }
```

- [ ] **Step 3: Add startup calls**

At the bottom of the script, find the startup section and update it to:

```javascript
        // Startup
        renderWorkouts();
        loadLiveData();
        checkForPendingCheckin();
```

- [ ] **Step 4: Commit**

```bash
git add prototype/index.html
git commit -m "ui: add Sunday check-in modal with 3-step flow"
```

---

## Chunk 6: Cleanup & Integration

### Task 13: Clean up old references and CSS

**Files:**
- Modify: `prototype/index.html`

- [ ] **Step 1: Remove dead code**

- Remove the old `updateProgressDisplay()` function (was for the old check-in tab)
- Remove the old `function submitCheckin()` (replaced by modal flow)
- Remove any references to `nutrition-tab` in `showTab` or other functions
- Remove old `updateNutritionFromPlan` if not already removed
- Remove the old `programData.rampup.week1` static data object (the entire `programData` const and `renderWorkouts()` function that used it) — this is replaced by AI-generated plans from the API. Keep only the API-driven rendering.
- Clean up CSS classes that are no longer used (`.metrics-dashboard`, `.week-mode-container`, `.phase-banner`, `.weekly-targets`, `.checkin-steps`, `.goals-card` etc.)

- [ ] **Step 2: Verify no broken references**

Open in browser: `http://localhost:3001`
- Workouts tab: shows day cards only, "I'm Done" button on today
- Lifestyle tab: shows nutrition targets, sleep protocol, grocery placeholder
- Progress tab: shows placeholder text (or real data if check-in was done)
- Check-in banner appears if no plan for current week

- [ ] **Step 3: Commit**

```bash
git add prototype/index.html
git commit -m "cleanup: remove old tab references, dead code, unused CSS"
```

---

### Task 14: Verify server starts and all endpoints respond

- [ ] **Step 1: Start the server**

Run: `cd /Users/jessicatalbert/Projects/vivi/server && npx tsx src/index.ts`
Expected: "Crea API server starting on port 3001"

- [ ] **Step 2: Test new endpoints**

```bash
# Test narrative endpoint
curl -H "Authorization: Bearer crea-dev-2026" http://localhost:3001/api/progress/narrative

# Test strength gains endpoint
curl -H "Authorization: Bearer crea-dev-2026" http://localhost:3001/api/progress/strength-gains

# Test metrics trends endpoint
curl -H "Authorization: Bearer crea-dev-2026" http://localhost:3001/api/metrics/trends

# Test simplified workout complete
curl -X POST -H "Authorization: Bearer crea-dev-2026" -H "Content-Type: application/json" \
  -d '{"exercises":[{"exercise_name":"Hip Thrust","weight_rating":"good"}]}' \
  http://localhost:3001/api/workout/complete
```

- [ ] **Step 3: Verify prototype loads**

Open `http://localhost:3001` in a browser. Verify three tabs render and the navigation works.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete UX restructure — 3 tabs + check-in modal"
```

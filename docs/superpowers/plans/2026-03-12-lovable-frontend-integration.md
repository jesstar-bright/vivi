# Lovable Frontend Integration Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the Lovable-generated React frontend into vivi as `client/`, wire it to the existing Hono API, and serve the built app from the server.

**Architecture:** The Lovable React app (Vite + React + TypeScript + shadcn/Tailwind) becomes `vivi/client/`. A thin API service layer replaces all hardcoded data imports. Vite proxies `/api/*` to Hono (port 3001) during dev. In production, Hono serves the built `client/dist/` as static files.

**Tech Stack:** React 18, Vite 5, TypeScript, Tailwind CSS, shadcn/ui, Framer Motion, @tanstack/react-query, Hono (server)

---

## File Structure

**New files:**
- `client/` — entire Lovable React app (copied from repo)
- `client/src/lib/api.ts` — API client with auth, base URL, typed fetch helpers
- `client/src/hooks/useCurrentPlan.ts` — react-query hook for `GET /api/plan/current`
- `client/src/hooks/useProgressSummary.ts` — react-query hook for `GET /api/progress/summary`
- `client/src/hooks/useProgressNarrative.ts` — react-query hook for `GET /api/progress/narrative`
- `client/src/hooks/useStrengthGains.ts` — react-query hook for `GET /api/progress/strength-gains`
- `client/src/hooks/useSubmitWorkout.ts` — react-query mutation for `POST /api/workout/complete`
- `client/src/hooks/useCheckin.ts` — react-query mutation for `POST /api/checkin/submit` + `POST /api/checkin/photo`
- `client/src/lib/transformPlan.ts` — transforms API `WeeklyPlan` shape → Lovable `DayData[]` shape

**Modified files:**
- `client/vite.config.ts` — add dev proxy for `/api/*` → `http://localhost:3001`, remove lovable-tagger
- `client/package.json` — rename, remove `lovable-tagger` dev dep
- `client/src/components/WorkoutsTab.tsx` — use `useCurrentPlan` hook instead of hardcoded `weekData`
- `client/src/components/PostWorkoutModal.tsx` — use `useSubmitWorkout` mutation, read exercises from current plan
- `client/src/components/CheckInModal.tsx` — use `useCheckin` mutation for real API submission
- `client/src/components/LifestyleTab.tsx` — read nutrition/sleep from plan API response
- `client/src/components/ProfileTab.tsx` — use progress hooks for real data
- `client/src/pages/Index.tsx` — pass plan data down, handle loading/error states
- `server/src/index.ts` — serve `client/dist/` static files instead of prototype HTML

**Deleted files:**
- `client/src/data/workoutData.ts` — replaced by API calls (types stay, moved to shared types)

---

## Chunk 1: Scaffold — Copy, Clean, Configure

### Task 1: Copy Lovable app into `client/`

**Files:**
- Create: `client/` (entire directory)

- [ ] **Step 1: Copy the Lovable repo into client/**

```bash
cp -r /tmp/lovable-crea /Users/jessicatalbert/Projects/vivi/client
```

- [ ] **Step 2: Remove git history from client**

The copied directory has its own `.git` — remove it so vivi's git tracks everything.

```bash
rm -rf client/.git
```

- [ ] **Step 3: Verify the copy**

```bash
ls client/src/components/WorkoutsTab.tsx
ls client/src/pages/Index.tsx
ls client/package.json
```
Expected: all files exist.

- [ ] **Step 4: Commit**

```bash
git add client/
git commit -m "feat: add Lovable React frontend as client/"
```

---

### Task 2: Clean Lovable-specific config

**Files:**
- Modify: `client/vite.config.ts`
- Modify: `client/package.json`

- [ ] **Step 1: Remove lovable-tagger from vite.config.ts**

Replace the entire `client/vite.config.ts` with:

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

Key changes:
- Removed `lovable-tagger` import and plugin
- Added `/api` proxy to Hono server on port 3001
- Removed `hmr.overlay: false` (not needed)

- [ ] **Step 2: Clean package.json**

In `client/package.json`:
- Change `"name"` from `"vite_react_shadcn_ts"` to `"crea-client"`
- Remove `"lovable-tagger"` from `devDependencies`

- [ ] **Step 3: Install dependencies**

```bash
cd client && npm install
```
Expected: clean install, no errors.

- [ ] **Step 4: Verify dev server starts**

```bash
cd client && npm run dev
```
Expected: Vite dev server starts on port 8080. The app loads in browser (still using hardcoded data at this point).

- [ ] **Step 5: Commit**

```bash
git add client/vite.config.ts client/package.json client/package-lock.json
git commit -m "chore: remove lovable-tagger, add API proxy, rename package"
```

---

## Chunk 2: API Layer — Service + Transform

### Task 3: Create API client

**Files:**
- Create: `client/src/lib/api.ts`

- [ ] **Step 1: Write the API client**

```typescript
const API_TOKEN = import.meta.env.VITE_API_TOKEN || "";

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_TOKEN}`,
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    // Attach full body to error for structured error responses (e.g. needs_metrics)
    const err = new Error(body.error || `API error: ${res.status}`);
    (err as any).body = body;
    (err as any).status = res.status;
    throw err;
  }

  return res.json();
}

export const api = {
  get: <T>(path: string) => apiFetch<T>(path),
  post: <T>(path: string, body: unknown) =>
    apiFetch<T>(path, { method: "POST", body: JSON.stringify(body) }),
  postForm: async <T>(path: string, formData: FormData): Promise<T> => {
    const res = await fetch(path, {
      method: "POST",
      headers: { Authorization: `Bearer ${API_TOKEN}` },
      body: formData,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `API error: ${res.status}`);
    }
    return res.json();
  },
};
```

Notes:
- Uses Vite env var `VITE_API_TOKEN` for Bearer auth (matches server's `API_TOKEN` check)
- Relative paths work because Vite proxy forwards `/api/*` to Hono
- `postForm` variant for multipart photo upload (no JSON content-type)

- [ ] **Step 2: Create `.env` template**

Create `client/.env.example`:
```
VITE_API_TOKEN=your-api-token-here
```

And create `client/.env` with the actual token (read from `server/.env`):
```bash
grep API_TOKEN ../server/.env | sed 's/API_TOKEN/VITE_API_TOKEN/' > client/.env
```

- [ ] **Step 3: Commit**

```bash
git add client/src/lib/api.ts client/.env.example
git commit -m "feat: add API client with auth and proxy support"
```

---

### Task 4: Create plan data transformer

**Files:**
- Create: `client/src/lib/transformPlan.ts`
- Modify: `client/src/data/workoutData.ts` (keep types only)

The server's `WeeklyPlan` shape (from `plan-generator.ts`) differs from the Lovable `DayData` shape. This transformer bridges them.

Server `WeeklyPlan.days[n]` shape:
```typescript
{
  day: string;          // "Monday"
  title: string;        // "Upper Body Strength"
  type: string;         // "strength" | "vigorous" | "recovery" | "rest"
  warmup: string[];     // ["Arm circles 30s", ...]
  exercises: Array<{ name, sets, reps, suggested_weight, rest, notes }>;
  cooldown: string[];
  estimated_duration: string;
}
```

Lovable `DayData` shape:
```typescript
{
  day: string; date: string; subtitle: string; type: WorkoutType;
  caution?: string; note?: string; rest?: boolean; activities?: string[];
  warmup?: string[]; main?: string[];
  superset?: { label: string; exercises: string[] };
  core?: { label: string; exercises: string[] };
  circuit?: { label: string; exercises: string[] };
  vigorous?: { title: string; content: string; target: string };
  finisher?: string;
}
```

- [ ] **Step 1: Strip hardcoded data from workoutData.ts, keep types + temporary data**

Replace `client/src/data/workoutData.ts` with types and temporary data exports. The `sleepData` stays permanently (it's static lifestyle guidance). The `nutritionData` and `weekData` are kept temporarily so components compile until Tasks 6-9 replace them. The `progressData` is also kept temporarily until Task 10.

```typescript
export type WorkoutType = "strength" | "vigorous" | "recovery" | "rest";

export interface DayData {
  day: string;
  date: string;
  subtitle: string;
  type: WorkoutType;
  caution?: string;
  note?: string;
  rest?: boolean;
  activities?: string[];
  warmup?: string[];
  main?: string[];
  superset?: { label: string; exercises: string[] };
  core?: { label: string; exercises: string[] };
  circuit?: { label: string; exercises: string[] };
  vigorous?: { title: string; content: string; target: string };
  finisher?: string;
}

export interface NutritionData {
  protein: string;
  calories: string;
  water: string;
  focus: string;
  note: string;
}

export interface ProgressSummary {
  current_week: number;
  total_weeks: number;
  check_ins_completed: number;
  mode_distribution: Record<string, number>;
  workout_stats: {
    total_exercises_logged: number;
    unique_exercises: number;
    weight_ratings: Record<string, number>;
  };
  averages: { energy: number | null; motivation: number | null };
}

// TEMPORARY — kept so components compile until Tasks 6-10 wire them to API.
// Delete these exports after all components are wired.
export const weekData: DayData[] = [];
export const nutritionData: NutritionData = {
  protein: "—", calories: "—", water: "—", focus: "—", note: "Loading...",
};
export const sleepData = {
  target: "7.5 hrs",
  timeline: [
    { time: "7:30 PM", label: "Last meal" },
    { time: "8:30 PM", label: "Stop fluids" },
    { time: "9:00 PM", label: "Screens off" },
    { time: "9:30 PM", label: "Lights out" },
    { time: "5:30 AM", label: "Wake" },
  ],
  note: "Poor sleep = high cortisol = fat storage. You can't out-train it.",
};
export const progressData = {
  narrative: "Check in Sunday to unlock your progress story.",
  strength: "Train a week. Then the numbers show.",
  metrics: "Health trends appear after your first week.",
  weeks: Array.from({ length: 12 }, (_, i) => ({ week: i + 1, status: "upcoming" as const })),
};
```

> **Note to implementer:** After Tasks 6-10 are complete and no component imports these temporary exports, delete `weekData`, `nutritionData`, and `progressData` from this file. `sleepData` can stay — it's static lifestyle guidance used directly in `LifestyleTab`.

- [ ] **Step 2: Write the transformer**

Create `client/src/lib/transformPlan.ts`:

```typescript
import type { DayData, WorkoutType, NutritionData } from "@/data/workoutData";

// Shape returned by GET /api/plan/current
export interface APIPlan {
  week: number;
  plan?: APIWeeklyPlan;
  mode?: string;
  needs_checkin?: boolean;
  auto_generated?: boolean;
}

interface APIWeeklyPlan {
  week_number: number;
  mode: string;
  date_range: { start: string; end: string };
  days: APIPlanDay[];
  weekly_cardio: {
    zone2_sessions: number;
    zone2_duration: string;
    vigorous_target: string;
    notes: string;
  };
  nutrition: {
    calories: number;
    protein_g: number;
    carb_timing: string;
    hydration: string;
    focus: string;
  };
  trainer_message: string;
}

interface APIPlanDay {
  day: string;
  title: string;
  type: string;
  warmup: string[];
  exercises: Array<{
    name: string;
    sets: number;
    reps: string;
    suggested_weight: string;
    suggested_weight_reasoning: string;
    rest: string;
    notes: string;
  }>;
  cooldown: string[];
  estimated_duration: string;
}

function formatDate(dateStr: string, dayName: string): string {
  // dateStr is the start of the week; compute day offset
  const dayIndex: Record<string, number> = {
    Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3,
    Thursday: 4, Friday: 5, Saturday: 6,
  };
  const start = new Date(dateStr);
  const startDow = start.getDay(); // 0=Sunday
  const targetDow = dayIndex[dayName] ?? 0;
  let offset = targetDow - startDow;
  if (offset < 0) offset += 7;
  const d = new Date(start);
  d.setDate(d.getDate() + offset);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function transformPlanDays(plan: APIWeeklyPlan): DayData[] {
  return plan.days.map((day) => {
    const type = day.type as WorkoutType;
    const date = formatDate(plan.date_range.start, day.day);
    const isRest = type === "rest";

    // Format exercises as "Name SETSxREPS (WEIGHT)"
    const mainExercises = day.exercises.map((ex) => {
      const weight = ex.suggested_weight && ex.suggested_weight !== "bodyweight"
        ? ` (${ex.suggested_weight})`
        : "";
      return `${ex.name} ${ex.sets}×${ex.reps}${weight}`;
    });

    const base: DayData = {
      day: day.day,
      date,
      subtitle: day.title,
      type,
    };

    if (isRest) {
      return {
        ...base,
        rest: true,
        activities: [
          ...day.warmup,
          ...mainExercises,
          ...day.cooldown,
        ].filter(Boolean),
      };
    }

    if (type === "vigorous") {
      return {
        ...base,
        vigorous: {
          title: day.title,
          content: mainExercises.join("\n"),
          target: plan.weekly_cardio.vigorous_target,
        },
        warmup: day.warmup.length > 0 ? day.warmup : undefined,
      };
    }

    // Strength / recovery
    return {
      ...base,
      warmup: day.warmup.length > 0 ? day.warmup : undefined,
      main: mainExercises.length > 0 ? mainExercises : undefined,
      finisher: day.cooldown.length > 0 ? day.cooldown.join(", ") : undefined,
    };
  });
}

export function transformNutrition(plan: APIWeeklyPlan): NutritionData {
  return {
    protein: `${plan.nutrition.protein_g}g`,
    calories: `${plan.nutrition.calories}`,
    water: plan.nutrition.hydration,
    focus: plan.nutrition.focus,
    note: plan.nutrition.carb_timing,
  };
}
```

- [ ] **Step 3: Commit**

```bash
git add client/src/data/workoutData.ts client/src/lib/transformPlan.ts
git commit -m "feat: add plan transformer and keep only types from workoutData"
```

---

### Task 5: Create react-query hooks

**Files:**
- Create: `client/src/hooks/useCurrentPlan.ts`
- Create: `client/src/hooks/useProgressSummary.ts`
- Create: `client/src/hooks/useProgressNarrative.ts`
- Create: `client/src/hooks/useStrengthGains.ts`
- Create: `client/src/hooks/useSubmitWorkout.ts`
- Create: `client/src/hooks/useCheckin.ts`

- [ ] **Step 1: Create useCurrentPlan hook**

```typescript
// client/src/hooks/useCurrentPlan.ts
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { APIPlan } from "@/lib/transformPlan";

export function useCurrentPlan() {
  return useQuery({
    queryKey: ["plan", "current"],
    queryFn: () => api.get<APIPlan>("/api/plan/current"),
    staleTime: 5 * 60 * 1000, // 5 min — plan doesn't change often
  });
}
```

- [ ] **Step 2: Create useSubmitWorkout hook**

```typescript
// client/src/hooks/useSubmitWorkout.ts
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
    },
  });
}
```

- [ ] **Step 3: Create useCheckin hook**

```typescript
// client/src/hooks/useCheckin.ts
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
  needs_metrics?: boolean;
  message?: string;
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
```

- [ ] **Step 4: Create progress hooks**

```typescript
// client/src/hooks/useProgressSummary.ts
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ProgressSummary } from "@/data/workoutData";

export function useProgressSummary() {
  return useQuery({
    queryKey: ["progress", "summary"],
    queryFn: () => api.get<ProgressSummary>("/api/progress/summary"),
    staleTime: 5 * 60 * 1000,
  });
}
```

```typescript
// client/src/hooks/useProgressNarrative.ts
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface NarrativeResponse {
  week?: number;
  mode?: string;
  narrative: string | null;
  message?: string;
  generated_at?: string;
}

export function useProgressNarrative() {
  return useQuery({
    queryKey: ["progress", "narrative"],
    queryFn: () => api.get<NarrativeResponse>("/api/progress/narrative"),
    staleTime: 10 * 60 * 1000,
  });
}
```

```typescript
// client/src/hooks/useStrengthGains.ts
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface StrengthGain {
  exercise: string;
  current_weight: string;
  start_weight: string;
  change: string;
  sessions: number;
}

export function useStrengthGains() {
  return useQuery({
    queryKey: ["progress", "strength-gains"],
    queryFn: () =>
      api.get<{ gains: StrengthGain[] }>("/api/progress/strength-gains"),
    staleTime: 10 * 60 * 1000,
  });
}
```

- [ ] **Step 5: Commit**

```bash
git add client/src/hooks/
git commit -m "feat: add react-query hooks for all API endpoints"
```

---

## Chunk 3: Wire Components to API

### Task 6: Wire WorkoutsTab to live plan data

**Files:**
- Modify: `client/src/pages/Index.tsx`
- Modify: `client/src/components/WorkoutsTab.tsx`

The current `WorkoutsTab` imports `weekData` from hardcoded data. Replace with `useCurrentPlan` hook.

- [ ] **Step 1: Update Index.tsx to fetch and pass plan data**

```typescript
// client/src/pages/Index.tsx
import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import TabBar from "@/components/TabBar";
import WorkoutsTab from "@/components/WorkoutsTab";
import LifestyleTab from "@/components/LifestyleTab";
import ProfileTab from "@/components/ProfileTab";
import CheckInModal from "@/components/CheckInModal";
import PostWorkoutModal from "@/components/PostWorkoutModal";
import { useCurrentPlan } from "@/hooks/useCurrentPlan";
import { transformPlanDays, transformNutrition } from "@/lib/transformPlan";

type Tab = "workouts" | "lifestyle" | "profile";

const Index = () => {
  const [tab, setTab] = useState<Tab>("workouts");
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [postWorkoutOpen, setPostWorkoutOpen] = useState(false);
  const { data: planResponse, isLoading, error } = useCurrentPlan();

  // Transform API data into component-friendly shapes
  const days = planResponse?.plan
    ? transformPlanDays(planResponse.plan)
    : [];
  const nutrition = planResponse?.plan
    ? transformNutrition(planResponse.plan)
    : null;
  const weekNumber = planResponse?.week ?? 1;
  const mode = planResponse?.mode ?? "";
  const needsCheckin = planResponse?.needs_checkin ?? false;

  // Find today's exercises for post-workout modal
  const todayName = new Date().toLocaleDateString("en-US", { weekday: "long" });
  const todayDay = days.find((d) => d.day === todayName) || days[0];
  const todayExercises = todayDay
    ? [
        ...(todayDay.main || []),
        ...(todayDay.superset?.exercises || []),
        ...(todayDay.core?.exercises || []),
        ...(todayDay.circuit?.exercises || []),
      ]
    : [];

  // If needs_checkin, open check-in modal
  const handleCheckinNeeded = () => setCheckInOpen(true);

  return (
    <div className="min-h-screen pb-24">
      <div className="max-w-md mx-auto px-4 pt-12">
        {tab === "workouts" && (
          <WorkoutsTab
            days={days}
            weekNumber={weekNumber}
            mode={mode}
            isLoading={isLoading}
            error={error?.message}
            needsCheckin={needsCheckin}
            onCheckin={handleCheckinNeeded}
            onDone={() => setPostWorkoutOpen(true)}
          />
        )}
        {tab === "lifestyle" && (
          <LifestyleTab nutrition={nutrition} isLoading={isLoading} />
        )}
        {tab === "profile" && <ProfileTab />}
      </div>

      <TabBar active={tab} onChange={setTab} />

      <AnimatePresence>
        {checkInOpen && (
          <CheckInModal
            open={checkInOpen}
            onClose={() => setCheckInOpen(false)}
            onComplete={(t) => {
              setCheckInOpen(false);
              setTab(t);
            }}
          />
        )}
        {postWorkoutOpen && (
          <PostWorkoutModal
            open={postWorkoutOpen}
            onClose={() => setPostWorkoutOpen(false)}
            exercises={todayExercises}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Index;
```

- [ ] **Step 2: Update WorkoutsTab to accept props instead of importing data**

```typescript
// client/src/components/WorkoutsTab.tsx
import DayCard from "./DayCard";
import CreaLogo from "./DiamondLogo";
import type { DayData } from "@/data/workoutData";

interface WorkoutsTabProps {
  days: DayData[];
  weekNumber: number;
  mode: string;
  isLoading: boolean;
  error?: string;
  needsCheckin: boolean;
  onCheckin: () => void;
  onDone: () => void;
}

const modeLabel: Record<string, string> = {
  push: "Push",
  maintain: "Maintain",
  rampup: "Ramp-Up",
};

const WorkoutsTab = ({
  days,
  weekNumber,
  mode,
  isLoading,
  error,
  needsCheckin,
  onCheckin,
  onDone,
}: WorkoutsTabProps) => {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <CreaLogo size={40} />
        <p className="text-sm text-muted-foreground font-medium">
          Loading your plan...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card-elevated text-center py-10">
        <p className="text-sm text-destructive font-medium">{error}</p>
      </div>
    );
  }

  if (needsCheckin) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-0.5">
          <CreaLogo size={22} />
          <p
            className="text-sm font-bold uppercase tracking-widest"
            style={{
              fontFamily: "'Syne', sans-serif",
              background: "var(--gradient-hero)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Crea
          </p>
        </div>
        <div className="card-elevated text-center py-12 space-y-4">
          <h2 className="text-xl font-bold text-foreground">
            Time for your check-in
          </h2>
          <p className="text-sm text-muted-foreground font-medium">
            Complete your weekly check-in to generate this week's plan.
          </p>
          <button onClick={onCheckin} className="btn-primary">
            Start Check-In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <CreaLogo size={22} />
            <p
              className="text-sm font-bold uppercase tracking-widest"
              style={{
                fontFamily: "'Syne', sans-serif",
                background: "var(--gradient-hero)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Crea
            </p>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Week {weekNumber} — {modeLabel[mode] || mode}
          </h1>
        </div>
      </div>
      {days.map((day, i) => (
        <DayCard key={day.day} data={day} isToday={i === 0} onDone={onDone} />
      ))}
    </div>
  );
};

export default WorkoutsTab;
```

- [ ] **Step 3: Verify the app still renders (with loading state)**

```bash
cd client && npm run dev
```
Open in browser. Should show loading spinner, then either plan data (if server is running with data) or an error message. Both are correct — means the wiring works.

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/Index.tsx client/src/components/WorkoutsTab.tsx
git commit -m "feat: wire WorkoutsTab to live API plan data"
```

---

### Task 7: Wire PostWorkoutModal to API

**Files:**
- Modify: `client/src/components/PostWorkoutModal.tsx`

Currently reads exercises from hardcoded `weekData[0]` and `onClose` does nothing with ratings. Wire to `useSubmitWorkout`.

- [ ] **Step 1: Update PostWorkoutModal**

```typescript
// client/src/components/PostWorkoutModal.tsx
import { useState } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { useSubmitWorkout } from "@/hooks/useSubmitWorkout";

interface PostWorkoutModalProps {
  open: boolean;
  onClose: () => void;
  exercises: string[];
}

type Rating = "good" | "light" | "heavy" | "skipped";

const ratingToApi: Record<Rating, "good" | "too_light" | "too_heavy" | "incomplete"> = {
  good: "good",
  light: "too_light",
  heavy: "too_heavy",
  skipped: "incomplete",
};

const ratingOptions: { id: Rating; label: string; emoji: string }[] = [
  { id: "good", label: "Good", emoji: "👍" },
  { id: "light", label: "Light", emoji: "🪶" },
  { id: "heavy", label: "Heavy", emoji: "🏋️" },
  { id: "skipped", label: "Skip", emoji: "⏭️" },
];

const PostWorkoutModal = ({ open, onClose, exercises }: PostWorkoutModalProps) => {
  const [ratings, setRatings] = useState<Record<string, Rating>>({});
  const [notes, setNotes] = useState("");
  const submitWorkout = useSubmitWorkout();

  if (!open) return null;

  const handleSubmit = () => {
    const payload = exercises
      .filter((ex) => ratings[ex])
      .map((ex) => {
        // Extract exercise name (before the sets notation)
        const name = ex.replace(/\s+\d+×.*$/, "").replace(/\s+\(.*\)$/, "").trim();
        return {
          exercise_name: name,
          weight_rating: ratingToApi[ratings[ex]],
          notes: notes || undefined,
        };
      });

    submitWorkout.mutate(
      { exercises: payload },
      { onSuccess: () => onClose() },
    );
  };

  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 30, stiffness: 300 }}
      className="fixed inset-x-0 bottom-0 z-[100] max-h-[85vh] overflow-y-auto rounded-t-3xl bg-card border-t border-border shadow-xl"
    >
      <div className="p-5 pb-24">
        <div className="w-10 h-1 rounded-full bg-border mx-auto mb-4" />
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-lg font-bold text-foreground">
            Rate Your Workout
          </h2>
          <button onClick={onClose} className="p-2 text-muted-foreground">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3">
          {exercises.map((ex) => (
            <div key={ex} className="card-elevated-sm bg-secondary/40">
              <p className="text-sm font-semibold text-foreground mb-2">{ex}</p>
              <div className="flex gap-1.5">
                {ratingOptions.map(({ id, label, emoji }) => (
                  <button
                    key={id}
                    onClick={() =>
                      setRatings((prev) => ({ ...prev, [ex]: id }))
                    }
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                      ratings[ex] === id
                        ? "bg-primary text-primary-foreground"
                        : "bg-card border border-border text-foreground"
                    }`}
                  >
                    <span className="block">{emoji}</span>
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes (optional)"
          className="w-full card-elevated-sm text-sm resize-none h-20 mt-4 placeholder:text-muted-foreground/60 bg-secondary/50"
        />

        <button
          onClick={handleSubmit}
          disabled={submitWorkout.isPending}
          className="btn-primary w-full mt-4 disabled:opacity-60"
        >
          {submitWorkout.isPending ? "Submitting..." : "Submit"}
        </button>
      </div>
    </motion.div>
  );
};

export default PostWorkoutModal;
```

Key changes:
- Accepts `exercises` prop (from Index, which gets it from plan data)
- Maps UI ratings to API ratings (`light` → `too_light`, etc.)
- Extracts clean exercise names from formatted strings
- Calls `POST /api/workout/complete` on submit
- Shows loading state during submission

- [ ] **Step 2: Commit**

```bash
git add client/src/components/PostWorkoutModal.tsx
git commit -m "feat: wire PostWorkoutModal to workout completion API"
```

---

### Task 8: Wire CheckInModal to API

**Files:**
- Modify: `client/src/components/CheckInModal.tsx`

Currently uses `setTimeout(2500)` to fake loading. Replace with real API calls.

- [ ] **Step 1: Update CheckInModal**

```typescript
// client/src/components/CheckInModal.tsx
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Upload, X } from "lucide-react";
import DiamondLogo from "./DiamondLogo";
import { useCheckin, useUploadPhoto } from "@/hooks/useCheckin";

interface CheckInModalProps {
  open: boolean;
  onClose: () => void;
  onComplete: (tab: "workouts" | "lifestyle") => void;
}

const ScaleButton = ({
  value,
  selected,
  onClick,
}: {
  value: number;
  selected: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={`w-12 h-12 rounded-xl text-sm font-bold transition-all ${
      selected
        ? "text-primary-foreground bg-primary shadow-md"
        : "bg-secondary text-foreground border border-border"
    }`}
  >
    {value}
  </button>
);

const modeLabels: Record<string, string> = {
  push: "Push Week",
  maintain: "Maintain Week",
  rampup: "Ramp-Up Week",
};

const CheckInModal = ({ open, onClose, onComplete }: CheckInModalProps) => {
  const [step, setStep] = useState(0);
  const [energy, setEnergy] = useState<number | null>(null);
  const [drive, setDrive] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [photoKey, setPhotoKey] = useState<string | null>(null);
  const [result, setResult] = useState<{
    mode: string;
    trainer_message: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkin = useCheckin();
  const uploadPhoto = useUploadPhoto();

  const handleNext = () => {
    if (step === 0 && energy && drive) setStep(1);
  };

  const handleSubmit = () => {
    if (!energy || !drive) return;
    setStep(2);
    setError(null);

    checkin.mutate(
      {
        energy,
        motivation: drive,
        notes,
        photo_key: photoKey || undefined,
      },
      {
        onSuccess: (data) => {
          setResult({ mode: data.mode, trainer_message: data.trainer_message });
        },
        onError: (err: any) => {
          // Server returns 422 with { needs_metrics: true } when Garmin data is missing
          if (err.body?.needs_metrics) {
            setError(err.body.message || "Metrics needed — check Garmin email.");
          } else {
            setError(err.message);
          }
        },
      },
    );
  };

  const handlePhotoUpload = async (file: File) => {
    try {
      const res = await uploadPhoto.mutateAsync(file);
      setPhotoKey(res.photo_key);
    } catch {
      // Photo is optional — don't block
    }
  };

  const reset = () => {
    setStep(0);
    setEnergy(null);
    setDrive(null);
    setNotes("");
    setPhotoKey(null);
    setResult(null);
    setError(null);
  };

  if (!open) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background"
    >
      <button
        onClick={() => {
          onClose();
          reset();
        }}
        className="absolute top-4 right-4 p-2 text-muted-foreground"
      >
        <X size={22} />
      </button>

      <div className="w-full max-w-sm px-6">
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div
              key="step0"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="text-center">
                <p className="text-xs font-bold uppercase tracking-widest text-primary mb-2">
                  Sunday
                </p>
                <h2 className="text-2xl font-bold">Check-In</h2>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-semibold text-foreground">
                  Energy level
                </p>
                <div className="flex gap-2 justify-center">
                  {[1, 2, 3, 4, 5].map((v) => (
                    <ScaleButton
                      key={v}
                      value={v}
                      selected={energy === v}
                      onClick={() => setEnergy(v)}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-semibold text-foreground">
                  Drive & motivation
                </p>
                <div className="flex gap-2 justify-center">
                  {[1, 2, 3, 4, 5].map((v) => (
                    <ScaleButton
                      key={v}
                      value={v}
                      selected={drive === v}
                      onClick={() => setDrive(v)}
                    />
                  ))}
                </div>
              </div>

              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes (optional)"
                className="w-full card-elevated-sm text-sm resize-none h-20 placeholder:text-muted-foreground/60 bg-secondary/50"
              />

              <button
                onClick={handleNext}
                disabled={!energy || !drive}
                className="btn-primary w-full disabled:opacity-40"
              >
                Next
              </button>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6 text-center"
            >
              <h2 className="text-2xl font-bold">Progress Photo</h2>
              <p className="text-sm text-muted-foreground font-medium">
                Optional — take or upload a photo
              </p>
              <div className="flex gap-3 justify-center">
                <label className="btn-ghost flex items-center gap-2 cursor-pointer">
                  <Camera size={16} /> Take Photo
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handlePhotoUpload(f);
                    }}
                  />
                </label>
                <label className="btn-ghost flex items-center gap-2 cursor-pointer">
                  <Upload size={16} /> Upload
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handlePhotoUpload(f);
                    }}
                  />
                </label>
              </div>
              {photoKey && (
                <p className="text-xs text-primary font-medium">
                  Photo uploaded
                </p>
              )}
              {uploadPhoto.isPending && (
                <p className="text-xs text-muted-foreground">Uploading...</p>
              )}
              <button onClick={handleSubmit} className="btn-primary w-full">
                {photoKey ? "Submit" : "Skip & Submit"}
              </button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center space-y-6"
            >
              {error ? (
                <div className="space-y-4 py-8">
                  <p className="text-sm text-destructive font-medium">
                    {error}
                  </p>
                  <button
                    onClick={() => {
                      setStep(0);
                      setError(null);
                    }}
                    className="btn-ghost"
                  >
                    Try Again
                  </button>
                </div>
              ) : !result ? (
                <div className="flex flex-col items-center gap-4 py-12">
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="text-primary"
                  >
                    <DiamondLogo size={56} />
                  </motion.div>
                  <p className="text-sm text-muted-foreground font-medium">
                    Analyzing your week...
                  </p>
                </div>
              ) : (
                <>
                  <div className="py-4">
                    <span className="type-badge type-badge-vigorous text-base px-5 py-2.5 inline-block">
                      {modeLabels[result.mode] || result.mode}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground font-medium">
                    {result.trainer_message}
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        onComplete("workouts");
                        reset();
                      }}
                      className="btn-primary flex-1"
                    >
                      See Workouts
                    </button>
                    <button
                      onClick={() => {
                        onComplete("lifestyle");
                        reset();
                      }}
                      className="btn-ghost flex-1"
                    >
                      See Lifestyle
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default CheckInModal;
```

Key changes:
- Real photo upload via `POST /api/checkin/photo`
- Real check-in submission via `POST /api/checkin/submit`
- Displays actual mode and trainer_message from AI response
- Handles `needs_metrics` error state (when Garmin data is missing)
- File inputs with `capture="environment"` for mobile camera

- [ ] **Step 2: Commit**

```bash
git add client/src/components/CheckInModal.tsx
git commit -m "feat: wire CheckInModal to real check-in API"
```

---

### Task 9: Wire LifestyleTab to plan nutrition data

**Files:**
- Modify: `client/src/components/LifestyleTab.tsx`

Currently imports hardcoded `nutritionData` and `sleepData`. Nutrition comes from the plan API. Sleep data stays static for now (it's lifestyle guidance, not API-driven).

- [ ] **Step 1: Update LifestyleTab to accept nutrition prop**

```typescript
// client/src/components/LifestyleTab.tsx
import { Droplets, Flame, Beef, Leaf, Moon } from "lucide-react";
import type { NutritionData } from "@/data/workoutData";

// Sleep data is lifestyle guidance — not API-driven
const sleepData = {
  target: "7.5 hrs",
  timeline: [
    { time: "7:30 PM", label: "Last meal" },
    { time: "8:30 PM", label: "Stop fluids" },
    { time: "9:00 PM", label: "Screens off" },
    { time: "9:30 PM", label: "Lights out" },
    { time: "5:30 AM", label: "Wake" },
  ],
  note: "Poor sleep = high cortisol = fat storage. You can't out-train it.",
};

const NutritionGrid = ({ data }: { data: NutritionData }) => (
  <div className="card-elevated">
    <h2 className="text-lg font-bold mb-4 text-foreground">Nutrition</h2>
    <div className="grid grid-cols-2 gap-2.5">
      {[
        { icon: Beef, label: "Protein", value: data.protein },
        { icon: Flame, label: "Calories", value: data.calories },
        { icon: Droplets, label: "Water", value: data.water },
        { icon: Leaf, label: "Focus", value: data.focus },
      ].map(({ icon: Icon, label, value }) => (
        <div
          key={label}
          className="card-elevated-sm flex items-center gap-3 bg-secondary/50"
        >
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Icon size={16} className="text-primary" />
          </div>
          <div className="text-left">
            <span className="text-[11px] font-medium text-muted-foreground block">
              {label}
            </span>
            <span className="text-sm font-bold text-foreground">{value}</span>
          </div>
        </div>
      ))}
    </div>
    <p className="text-xs text-muted-foreground mt-3 font-medium italic">
      {data.note}
    </p>
  </div>
);

const SleepCard = () => (
  <div className="card-elevated">
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-lg font-bold text-foreground">Sleep</h2>
      <span className="flex items-center gap-1.5 text-sm font-bold text-primary bg-primary/10 px-3 py-1.5 rounded-lg">
        <Moon size={14} /> {sleepData.target}
      </span>
    </div>
    <div className="relative pl-5 space-y-3">
      <div className="absolute left-[9px] top-2 bottom-2 w-0.5 rounded-full bg-primary/15" />
      {sleepData.timeline.map(({ time, label }) => (
        <div key={time} className="flex items-center gap-3 relative">
          <div className="w-2.5 h-2.5 rounded-full bg-primary/40 shrink-0 -ml-[7px] ring-2 ring-card" />
          <span className="text-xs font-semibold text-muted-foreground w-16 shrink-0">
            {time}
          </span>
          <span className="text-sm font-medium text-foreground">{label}</span>
        </div>
      ))}
    </div>
    <p className="text-xs text-muted-foreground mt-4 font-medium italic">
      {sleepData.note}
    </p>
  </div>
);

const GroceryCard = () => (
  <div className="card-elevated flex items-center justify-center py-10">
    <p className="text-sm font-medium text-muted-foreground">
      Grocery List — Coming Soon
    </p>
  </div>
);

interface LifestyleTabProps {
  nutrition: NutritionData | null;
  isLoading: boolean;
}

const LifestyleTab = ({ nutrition, isLoading }: LifestyleTabProps) => (
  <div className="space-y-3">
    <h1 className="text-2xl font-bold tracking-tight text-foreground mb-4">
      Lifestyle
    </h1>
    {isLoading ? (
      <div className="card-elevated text-center py-10">
        <p className="text-sm text-muted-foreground font-medium">Loading...</p>
      </div>
    ) : nutrition ? (
      <NutritionGrid data={nutrition} />
    ) : (
      <div className="card-elevated text-center py-10">
        <p className="text-sm text-muted-foreground font-medium">
          Complete a check-in to see your nutrition plan.
        </p>
      </div>
    )}
    <SleepCard />
    <GroceryCard />
  </div>
);

export default LifestyleTab;
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/LifestyleTab.tsx
git commit -m "feat: wire LifestyleTab to API nutrition data"
```

---

### Task 10: Wire ProfileTab to progress APIs

**Files:**
- Modify: `client/src/components/ProfileTab.tsx`

Currently shows placeholder "locked" cards with hardcoded messages. Wire to real progress data.

- [ ] **Step 1: Update ProfileTab**

```typescript
// client/src/components/ProfileTab.tsx
import { Lock, TrendingUp } from "lucide-react";
import { useProgressSummary } from "@/hooks/useProgressSummary";
import { useProgressNarrative } from "@/hooks/useProgressNarrative";
import { useStrengthGains } from "@/hooks/useStrengthGains";

const PlaceholderCard = ({
  title,
  message,
}: {
  title: string;
  message: string;
}) => (
  <div className="card-elevated py-8">
    <div className="flex flex-col items-center text-center">
      <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center mb-3">
        <Lock size={16} className="text-muted-foreground" />
      </div>
      <h3 className="text-sm font-bold text-foreground mb-1">{title}</h3>
      <p className="text-xs text-muted-foreground font-medium">{message}</p>
    </div>
  </div>
);

const NarrativeCard = ({ narrative }: { narrative: string }) => (
  <div className="card-elevated">
    <h3 className="text-sm font-bold text-foreground mb-2">Your Story</h3>
    <p className="text-sm text-foreground/80 font-medium leading-relaxed">
      {narrative}
    </p>
  </div>
);

const StrengthCard = ({
  gains,
}: {
  gains: Array<{
    exercise: string;
    change: string;
    sessions: number;
  }>;
}) => (
  <div className="card-elevated">
    <h3 className="text-sm font-bold text-foreground mb-3">
      What You Can Do Now
    </h3>
    <div className="space-y-2">
      {gains.map((g) => (
        <div
          key={g.exercise}
          className="flex items-center justify-between py-1.5"
        >
          <span className="text-sm font-medium text-foreground">
            {g.exercise}
          </span>
          <span className="text-xs font-bold text-primary">{g.change}</span>
        </div>
      ))}
    </div>
  </div>
);

const WeekChart = ({
  currentWeek,
  totalWeeks,
  modeDistribution,
}: {
  currentWeek: number;
  totalWeeks: number;
  modeDistribution: Record<string, number>;
}) => {
  const weeks = Array.from({ length: totalWeeks }, (_, i) => ({
    week: i + 1,
    status:
      i + 1 < currentWeek
        ? "complete"
        : i + 1 === currentWeek
          ? "current"
          : "upcoming",
  }));

  return (
    <div className="card-elevated">
      <h3 className="text-sm font-bold text-foreground mb-4">
        Your {totalWeeks} Weeks
      </h3>
      <div className="flex items-end gap-1.5 h-20">
        {weeks.map(({ week, status }) => (
          <div
            key={week}
            className={`flex-1 rounded-md transition-all ${
              status === "complete"
                ? "bg-primary/60"
                : status === "current"
                  ? "bg-primary"
                  : "bg-secondary"
            }`}
            style={{
              height:
                status === "upcoming"
                  ? "30%"
                  : status === "current"
                    ? "100%"
                    : "60%",
            }}
          />
        ))}
      </div>
      <div className="flex justify-between mt-2">
        <span className="text-[10px] font-semibold text-muted-foreground">
          W1
        </span>
        <span className="text-[10px] font-semibold text-muted-foreground">
          W{totalWeeks}
        </span>
      </div>
    </div>
  );
};

const ProfileTab = () => {
  const { data: summary } = useProgressSummary();
  const { data: narrativeData } = useProgressNarrative();
  const { data: strengthData } = useStrengthGains();

  const hasNarrative = narrativeData?.narrative;
  const hasGains = strengthData?.gains && strengthData.gains.length > 0;

  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-bold tracking-tight text-foreground mb-4">
        Progress
      </h1>

      {hasNarrative ? (
        <NarrativeCard narrative={narrativeData.narrative!} />
      ) : (
        <PlaceholderCard
          title="Your Story"
          message="Check in Sunday to unlock your progress story."
        />
      )}

      {hasGains ? (
        <StrengthCard gains={strengthData.gains} />
      ) : (
        <PlaceholderCard
          title="What You Can Do Now"
          message="Train a week. Then the numbers show."
        />
      )}

      {summary ? (
        <WeekChart
          currentWeek={summary.current_week}
          totalWeeks={summary.total_weeks}
          modeDistribution={summary.mode_distribution}
        />
      ) : (
        <PlaceholderCard
          title="Under the Surface"
          message="Health trends appear after your first week."
        />
      )}
    </div>
  );
};

export default ProfileTab;
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/ProfileTab.tsx
git commit -m "feat: wire ProfileTab to progress/narrative/strength APIs"
```

---

## Chunk 4: Server Integration + Cleanup

### Task 11: Update server to serve React build

**Files:**
- Modify: `server/src/index.ts`

Replace the prototype HTML serving with static file serving from `client/dist/`.

- [ ] **Step 1: Update server index.ts**

Two changes:

**First**, add this import at the top of `server/src/index.ts` (alongside the other imports, around line 6):

```typescript
import { serveStatic } from '@hono/node-server/serve-static';
```

**Second**, replace the prototype-serving block (lines 48-57, the `app.get('/', ...)` handler) with:

```typescript
// Serve React frontend build (static assets: JS, CSS, images)
app.use('/*', serveStatic({ root: '../client/dist' }));

// SPA fallback — serve index.html for client-side routes
app.get('/*', (c) => {
  const htmlPath = resolve(process.cwd(), '../client/dist/index.html');
  try {
    const html = readFileSync(htmlPath, 'utf-8');
    return c.html(html);
  } catch {
    return c.text('Frontend not built — run "npm run build" in client/', 404);
  }
});
```

> **Important:** The `serveStatic` and SPA fallback MUST be registered AFTER all `/api/*` routes so they don't shadow API endpoints. The `root` path is relative to the server's working directory (`server/`), so always start the server from the `server/` directory.

- [ ] **Step 2: Install @hono/node-server if needed (already a dep, just ensure serve-static export is available)**

The `@hono/node-server` package already includes `serve-static`. No new install needed.

- [ ] **Step 3: Build the client**

```bash
cd client && npm run build
```
Expected: `client/dist/` directory created with built React app.

- [ ] **Step 4: Test server serves the built app**

```bash
cd server && npm run dev
```
Open `http://localhost:3001` — should show the React app.

- [ ] **Step 5: Commit**

```bash
git add server/src/index.ts
git commit -m "feat: serve React frontend build from Hono server"
```

---

### Task 12: Add root-level dev script and cleanup

**Files:**
- Modify: `client/.gitignore` (add `.env`)

- [ ] **Step 1: Ensure .env is gitignored in client**

Check `client/.gitignore` includes:
```
.env
.env.local
```

- [ ] **Step 2: Verify full dev workflow**

Terminal 1:
```bash
cd server && npm run dev
```

Terminal 2:
```bash
cd client && npm run dev
```

Open `http://localhost:8080`. The React app should load and API calls should proxy to the Hono server on port 3001.

- [ ] **Step 3: Verify production build workflow**

```bash
cd client && npm run build
cd ../server && npm run dev
```

Open `http://localhost:3001`. The server should serve the built React app directly.

- [ ] **Step 4: Commit any remaining changes**

```bash
git add -A
git commit -m "chore: finalize dev workflow and gitignore"
```

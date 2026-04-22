/**
 * Eval fixture helpers for the Crea Trainer agent eval harness.
 *
 * These helpers own DB seeding and teardown for eval users (a range of
 * user_ids reserved for the harness — see EVAL_USER_BASE in eval-trainer.ts,
 * intentionally far from Jessica's real user_id = 1 so a rogue reset can't
 * nuke real data). Every eval scenario gets a clean slate before being
 * seeded with its specific fixture.
 *
 * All four legacy tables (check_ins, exercise_logs, weekly_metrics,
 * workout_plans) now have a user_id column, so reset and seed are fully
 * scoped per user. That makes it safe to run scenarios concurrently against
 * disjoint user_ids.
 */

import { eq } from 'drizzle-orm';
import { db, schema } from '../db/index.js';

// ---------------------------------------------------------------------------
// Fixture row shapes
// ---------------------------------------------------------------------------

export type UserProfileOverrides = Partial<
  typeof schema.userProfiles.$inferInsert
>;

export type CheckInFixture = {
  week_number: number;
  date: string; // YYYY-MM-DD
  photo_url?: string | null;
  photo_analysis?: unknown;
  self_report_energy?: number;
  self_report_motivation?: number;
  self_report_notes?: string;
  mode_decision: 'push' | 'maintain' | 'rampup' | 'deload';
  mode_reasoning?: string;
  trainer_message?: string;
};

export type ExerciseLogFixture = {
  date: string; // YYYY-MM-DD
  exercise_name: string;
  suggested_weight?: string;
  actual_weight_used?: string;
  sets_completed?: number;
  reps_completed?: string;
  weight_rating?: 'good' | 'too_heavy' | 'too_light' | 'incomplete';
  notes?: string;
};

export type WeeklyMetricFixture = {
  date: string; // YYYY-MM-DD
  rhr?: number;
  hrv?: number;
  sleep_score?: number;
  sleep_hours?: number;
  body_battery?: number;
  steps?: number;
  vigorous_minutes?: number;
  stress_avg?: number;
  weight?: number;
};

export type TrainingBlockFixture = {
  block_number: number;
  weeks: number;
  theme: string;
  focus_areas: string[];
  intent_reasoning: string;
  status: 'proposed' | 'active' | 'completed' | 'cancelled';
  started_at?: Date | null;
  completed_at?: Date | null;
};

export type WorkoutModificationFixture = {
  date: string; // YYYY-MM-DD
  modification_type:
    | 'swap_exercise'
    | 'change_weight'
    | 'skip_set'
    | 'skip_block'
    | 'move_day'
    | 'cancel_replace'
    | 'regenerate_day';
  payload: unknown;
  source?: 'user_initiated' | 'agent_initiated';
};

export type MemoryFixture = Record<string, unknown>;

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------

/**
 * Wipe all agent-related state for the given user.
 *
 * Every table is scoped by user_id, so concurrent scenarios running against
 * disjoint user_ids do not interfere with each other or with real users.
 */
export async function resetEvalUser(userId: number): Promise<void> {
  await db
    .delete(schema.trainerMemory)
    .where(eq(schema.trainerMemory.userId, userId));
  await db
    .delete(schema.trainingBlocks)
    .where(eq(schema.trainingBlocks.userId, userId));
  await db
    .delete(schema.workoutModifications)
    .where(eq(schema.workoutModifications.userId, userId));
  await db.delete(schema.checkIns).where(eq(schema.checkIns.userId, userId));
  await db
    .delete(schema.workoutPlans)
    .where(eq(schema.workoutPlans.userId, userId));
  await db
    .delete(schema.exerciseLogs)
    .where(eq(schema.exerciseLogs.userId, userId));
  await db
    .delete(schema.weeklyMetrics)
    .where(eq(schema.weeklyMetrics.userId, userId));
}

// ---------------------------------------------------------------------------
// Seed helpers
// ---------------------------------------------------------------------------

/**
 * Seed (or upsert) the user_profiles row for the eval user with a minimal
 * sensible baseline plus any per-scenario overrides.
 *
 * Uses an explicit id so the serial default doesn't produce a different pk.
 */
export async function seedProfile(
  userId: number,
  overrides: UserProfileOverrides = {},
): Promise<void> {
  const baseline = {
    id: userId,
    name: 'Eval User',
    startDate: '2026-01-01',
    height: 65,
    conditions: null as string | null,
    goalWeight: 140,
    currentWeight: 155,
    postOpDate: null as string | null,
    postOpCleared: true,
  };
  const row = { ...baseline, ...overrides, id: userId };

  await db
    .insert(schema.userProfiles)
    .values(row as typeof schema.userProfiles.$inferInsert)
    .onConflictDoUpdate({
      target: schema.userProfiles.id,
      set: {
        name: row.name,
        startDate: row.startDate,
        height: row.height ?? null,
        conditions: row.conditions ?? null,
        goalWeight: row.goalWeight ?? null,
        currentWeight: row.currentWeight ?? null,
        postOpDate: row.postOpDate ?? null,
        postOpCleared: row.postOpCleared ?? false,
      },
    });
}

/**
 * Seed check_ins rows scoped to the given user.
 */
export async function seedCheckIns(
  userId: number,
  fixtures: CheckInFixture[],
): Promise<void> {
  if (fixtures.length === 0) return;

  await db.insert(schema.checkIns).values(
    fixtures.map((f) => ({
      userId,
      weekNumber: f.week_number,
      date: f.date,
      photoUrl: f.photo_url ?? null,
      photoAnalysis: (f.photo_analysis as any) ?? null,
      selfReportEnergy: f.self_report_energy ?? null,
      selfReportMotivation: f.self_report_motivation ?? null,
      selfReportNotes: f.self_report_notes ?? null,
      modeDecision: f.mode_decision,
      modeReasoning: f.mode_reasoning ?? null,
      trainerMessage: f.trainer_message ?? null,
    })),
  );
}

/**
 * Seed exercise_logs rows scoped to the given user.
 */
export async function seedWorkoutLogs(
  userId: number,
  fixtures: ExerciseLogFixture[],
): Promise<void> {
  if (fixtures.length === 0) return;

  await db.insert(schema.exerciseLogs).values(
    fixtures.map((f) => ({
      userId,
      date: f.date,
      exerciseName: f.exercise_name,
      suggestedWeight: f.suggested_weight ?? null,
      actualWeightUsed: f.actual_weight_used ?? null,
      setsCompleted: f.sets_completed ?? null,
      repsCompleted: f.reps_completed ?? null,
      weightRating: f.weight_rating ?? null,
      notes: f.notes ?? null,
    })),
  );
}

/**
 * Seed weekly_metrics rows scoped to the given user.
 * `date` is UNIQUE per user in weekly_metrics, so fixtures must use distinct
 * dates within a single user's seed set.
 */
export async function seedMetrics(
  userId: number,
  fixtures: WeeklyMetricFixture[],
): Promise<void> {
  if (fixtures.length === 0) return;

  await db.insert(schema.weeklyMetrics).values(
    fixtures.map((f) => ({
      userId,
      date: f.date,
      rhr: f.rhr ?? null,
      hrv: f.hrv ?? null,
      sleepScore: f.sleep_score ?? null,
      sleepHours: f.sleep_hours ?? null,
      bodyBattery: f.body_battery ?? null,
      steps: f.steps ?? null,
      vigorousMinutes: f.vigorous_minutes ?? null,
      stressAvg: f.stress_avg ?? null,
      weight: f.weight ?? null,
    })),
  );
}

/**
 * Seed training_blocks rows for the user. Each fixture is inserted with
 * user_id = userId.
 */
export async function seedBlocks(
  userId: number,
  fixtures: TrainingBlockFixture[],
): Promise<void> {
  if (fixtures.length === 0) return;

  await db.insert(schema.trainingBlocks).values(
    fixtures.map((f) => ({
      userId,
      blockNumber: f.block_number,
      weeks: f.weeks,
      theme: f.theme,
      focusAreas: f.focus_areas as any,
      intentReasoning: f.intent_reasoning,
      status: f.status,
      startedAt: f.started_at ?? null,
      completedAt: f.completed_at ?? null,
    })),
  );
}

/**
 * Seed workout_modifications rows for the user.
 */
export async function seedWorkoutModifications(
  userId: number,
  fixtures: WorkoutModificationFixture[],
): Promise<void> {
  if (fixtures.length === 0) return;

  await db.insert(schema.workoutModifications).values(
    fixtures.map((f) => ({
      userId,
      date: f.date,
      exerciseLogId: null,
      modificationType: f.modification_type,
      payload: f.payload as any,
      source: f.source ?? 'user_initiated',
    })),
  );
}

/**
 * Seed trainer_memory rows. Each top-level key of `memory` becomes one row.
 */
export async function seedMemory(
  userId: number,
  memory: MemoryFixture,
): Promise<void> {
  const entries = Object.entries(memory);
  if (entries.length === 0) return;

  await db.insert(schema.trainerMemory).values(
    entries.map(([key, value]) => ({
      userId,
      key,
      value: value as any,
    })),
  );
}

import { pgTable, serial, text, integer, real, date, timestamp, boolean, jsonb } from 'drizzle-orm/pg-core';

export const userProfiles = pgTable('user_profiles', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  startDate: date('start_date').notNull(),
  height: real('height'),
  conditions: text('conditions'),
  goalWeight: real('goal_weight'),
  currentWeight: real('current_weight'),
  postOpDate: date('post_op_date'),
  postOpCleared: boolean('post_op_cleared').default(false),
});

export const weeklyMetrics = pgTable('weekly_metrics', {
  id: serial('id').primaryKey(),
  date: date('date').notNull().unique(),
  rhr: real('rhr'),
  hrv: real('hrv'),
  sleepScore: real('sleep_score'),
  sleepHours: real('sleep_hours'),
  bodyBattery: real('body_battery'),
  steps: integer('steps'),
  vigorousMinutes: integer('vigorous_minutes'),
  stressAvg: real('stress_avg'),
  weight: real('weight'),
});

export const checkIns = pgTable('check_ins', {
  id: serial('id').primaryKey(),
  weekNumber: integer('week_number').notNull(),
  date: date('date').notNull(),
  photoUrl: text('photo_url'),
  photoAnalysis: jsonb('photo_analysis'),
  selfReportEnergy: integer('self_report_energy'),
  selfReportMotivation: integer('self_report_motivation'),
  selfReportNotes: text('self_report_notes'),
  modeDecision: text('mode_decision').notNull(), // 'push' | 'maintain' | 'rampup'
  modeReasoning: text('mode_reasoning'),
  trainerMessage: text('trainer_message'),
});

export const workoutPlans = pgTable('workout_plans', {
  id: serial('id').primaryKey(),
  weekNumber: integer('week_number').notNull(),
  mode: text('mode').notNull(), // 'push' | 'maintain' | 'rampup'
  planJson: jsonb('plan_json').notNull(),
  nutritionJson: jsonb('nutrition_json'),
  focusAreas: jsonb('focus_areas'),
  generatedAt: timestamp('generated_at').defaultNow(),
});

export const exerciseLogs = pgTable('exercise_logs', {
  id: serial('id').primaryKey(),
  date: date('date').notNull(),
  exerciseName: text('exercise_name').notNull(),
  suggestedWeight: text('suggested_weight'),
  actualWeightUsed: text('actual_weight_used'),
  setsCompleted: integer('sets_completed'),
  repsCompleted: text('reps_completed'),
  weightRating: text('weight_rating'), // 'good' | 'too_heavy' | 'too_light' | 'incomplete'
  notes: text('notes'),
});

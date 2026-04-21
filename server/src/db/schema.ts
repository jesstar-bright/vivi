import { pgTable, serial, text, integer, real, date, timestamp, boolean, jsonb, primaryKey } from 'drizzle-orm/pg-core';

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
  progressNarrative: text('progress_narrative'),
  generatedAt: timestamp('generated_at').defaultNow(),
});

export const mealPlans = pgTable('meal_plans', {
  id: serial('id').primaryKey(),
  date: date('date').notNull().unique(),
  planJson: jsonb('plan_json').notNull(),
  calorieTarget: integer('calorie_target'),
  proteinTarget: integer('protein_target'),
  weekNumber: integer('week_number'),
  weeklyContext: jsonb('weekly_context'),
  generatedAt: timestamp('generated_at').defaultNow(),
});

export const recipes = pgTable('recipes', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  source: text('source').notNull(),
  category: text('category').notNull(), // breakfast|lunch|dinner|side|dessert|smoothie
  ingredients: jsonb('ingredients').notNull(), // [{name, quantity, unit}]
  steps: jsonb('steps').notNull(), // string[]
  prepTime: text('prep_time'),
  cookTime: text('cook_time'),
  servings: integer('servings'),
  macrosPerServing: jsonb('macros_per_serving'), // {calories, protein_g, carbs_g, fat_g}
  tags: jsonb('tags'), // string[]
  notes: text('notes'),
  createdBy: integer('created_by'),
});

export const userPantry = pgTable('user_pantry', {
  id: serial('id').primaryKey(),
  userId: integer('user_id'),
  name: text('name').notNull(),
  brand: text('brand'),
  category: text('category').notNull(), // protein-powder|supplement|staple
  nutritionPerServing: jsonb('nutrition_per_serving'), // {calories, protein_g, carbs_g, fat_g, serving_size, serving_unit}
  flavor: text('flavor'),
  notes: text('notes'),
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

export const trainerMemory = pgTable('trainer_memory', {
  userId: integer('user_id').notNull(),
  key: text('key').notNull(),
  value: jsonb('value').notNull(),
  lastUpdated: timestamp('last_updated').defaultNow().notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.key] }),
}));

export const trainingBlocks = pgTable('training_blocks', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  blockNumber: integer('block_number').notNull(),
  weeks: integer('weeks').notNull(),         // typically 4; can be 3, 6, or 8
  theme: text('theme').notNull(),            // e.g. 'strength + mobility'
  focusAreas: jsonb('focus_areas').notNull(), // string[]
  intentReasoning: text('intent_reasoning').notNull(),
  status: text('status').notNull(),          // 'proposed' | 'active' | 'completed' | 'cancelled'
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const workoutModifications = pgTable('workout_modifications', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  date: date('date').notNull(),              // the date of the session being modified
  exerciseLogId: integer('exercise_log_id'), // nullable: edit might be pre-completion
  modificationType: text('modification_type').notNull(), // 'swap_exercise' | 'change_weight' | 'skip_set' | 'skip_block' | 'move_day' | 'cancel_replace' | 'regenerate_day'
  payload: jsonb('payload').notNull(),       // shape varies by type
  source: text('source').notNull(),          // 'user_initiated' | 'agent_initiated'
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

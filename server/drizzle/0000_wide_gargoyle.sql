CREATE TABLE "check_ins" (
	"id" serial PRIMARY KEY NOT NULL,
	"week_number" integer NOT NULL,
	"date" date NOT NULL,
	"photo_url" text,
	"photo_analysis" jsonb,
	"self_report_energy" integer,
	"self_report_motivation" integer,
	"self_report_notes" text,
	"mode_decision" text NOT NULL,
	"mode_reasoning" text,
	"trainer_message" text
);
--> statement-breakpoint
CREATE TABLE "exercise_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"exercise_name" text NOT NULL,
	"suggested_weight" text,
	"actual_weight_used" text,
	"sets_completed" integer,
	"reps_completed" text,
	"weight_rating" text,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"start_date" date NOT NULL,
	"height" real,
	"conditions" text,
	"goal_weight" real,
	"current_weight" real,
	"post_op_date" date,
	"post_op_cleared" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "weekly_metrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"rhr" real,
	"hrv" real,
	"sleep_score" real,
	"sleep_hours" real,
	"body_battery" real,
	"steps" integer,
	"vigorous_minutes" integer,
	"stress_avg" real,
	"weight" real,
	CONSTRAINT "weekly_metrics_date_unique" UNIQUE("date")
);
--> statement-breakpoint
CREATE TABLE "workout_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"week_number" integer NOT NULL,
	"mode" text NOT NULL,
	"plan_json" jsonb NOT NULL,
	"nutrition_json" jsonb,
	"focus_areas" jsonb,
	"progress_narrative" text,
	"generated_at" timestamp DEFAULT now()
);

ALTER TABLE "check_ins" ADD COLUMN "user_id" integer;--> statement-breakpoint
ALTER TABLE "exercise_logs" ADD COLUMN "user_id" integer;--> statement-breakpoint
ALTER TABLE "weekly_metrics" ADD COLUMN "user_id" integer;--> statement-breakpoint
ALTER TABLE "workout_plans" ADD COLUMN "user_id" integer;
CREATE TABLE "auth_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"token" text NOT NULL,
	"label" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_used_at" timestamp,
	CONSTRAINT "auth_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN "date_of_birth" date;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN "menstrual_status" text;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN "last_period_start" date;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN "cycle_length_days" integer;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN "menopause_onset_date" date;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN "medications" text;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN "sensitivities" text;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN "activity_baseline" text;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN "goals_text" text;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN "equipment_access" text;
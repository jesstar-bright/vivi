CREATE TABLE "recipes" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"source" text NOT NULL,
	"category" text NOT NULL,
	"ingredients" jsonb NOT NULL,
	"steps" jsonb NOT NULL,
	"prep_time" text,
	"cook_time" text,
	"servings" integer,
	"macros_per_serving" jsonb,
	"tags" jsonb,
	"notes" text,
	"created_by" integer
);
--> statement-breakpoint
CREATE TABLE "user_pantry" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"name" text NOT NULL,
	"brand" text,
	"category" text NOT NULL,
	"nutrition_per_serving" jsonb,
	"flavor" text,
	"notes" text
);
--> statement-breakpoint
ALTER TABLE "meal_plans" ADD COLUMN "week_number" integer;--> statement-breakpoint
ALTER TABLE "meal_plans" ADD COLUMN "weekly_context" jsonb;
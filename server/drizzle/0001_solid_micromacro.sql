CREATE TABLE "meal_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"plan_json" jsonb NOT NULL,
	"calorie_target" integer,
	"protein_target" integer,
	"generated_at" timestamp DEFAULT now(),
	CONSTRAINT "meal_plans_date_unique" UNIQUE("date")
);

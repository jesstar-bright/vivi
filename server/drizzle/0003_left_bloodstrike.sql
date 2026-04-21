CREATE TABLE "trainer_memory" (
	"user_id" integer NOT NULL,
	"key" text NOT NULL,
	"value" jsonb NOT NULL,
	"last_updated" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "trainer_memory_user_id_key_pk" PRIMARY KEY("user_id","key")
);
--> statement-breakpoint
CREATE TABLE "training_blocks" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"block_number" integer NOT NULL,
	"weeks" integer NOT NULL,
	"theme" text NOT NULL,
	"focus_areas" jsonb NOT NULL,
	"intent_reasoning" text NOT NULL,
	"status" text NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workout_modifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"date" date NOT NULL,
	"exercise_log_id" integer,
	"modification_type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"source" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

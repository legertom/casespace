CREATE TYPE "public"."discovery_constraint" AS ENUM('unclear_requirements', 'missing_information', 'input_quality', 'missing_context', 'data_access', 'permissions', 'workflow', 'technical_feasibility', 'model_capability', 'reliability', 'evaluation', 'human_adoption', 'incentives', 'ownership', 'organizational_alignment', 'scale', 'cost', 'security_privacy', 'other', 'unclear');--> statement-breakpoint
ALTER TYPE "public"."coach_intent" ADD VALUE 'discovery';--> statement-breakpoint
ALTER TYPE "public"."uc_source" ADD VALUE 'discovery';--> statement-breakpoint
CREATE TABLE "discovery_checkpoints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chat_id" uuid,
	"user_id" uuid NOT NULL,
	"use_case_id" uuid,
	"working_title" text NOT NULL,
	"stated_problem" text,
	"refined_problem" text NOT NULL,
	"baseline" text,
	"failure_point" text,
	"dominant_constraint" "discovery_constraint" NOT NULL,
	"dominant_constraint_detail" text NOT NULL,
	"next_action" text NOT NULL,
	"expected_learning" text NOT NULL,
	"why_this_step" text NOT NULL,
	"owner_name" text,
	"return_condition" text,
	"unresolved_questions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "coach_chats" ADD COLUMN "use_case_id" uuid;--> statement-breakpoint
ALTER TABLE "discovery_checkpoints" ADD CONSTRAINT "discovery_checkpoints_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discovery_checkpoints" ADD CONSTRAINT "discovery_checkpoints_use_case_id_use_cases_id_fk" FOREIGN KEY ("use_case_id") REFERENCES "public"."use_cases"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "discovery_checkpoints_user_idx" ON "discovery_checkpoints" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "discovery_checkpoints_chat_idx" ON "discovery_checkpoints" USING btree ("chat_id");--> statement-breakpoint
CREATE INDEX "discovery_checkpoints_use_case_idx" ON "discovery_checkpoints" USING btree ("use_case_id");--> statement-breakpoint
ALTER TABLE "coach_chats" ADD CONSTRAINT "coach_chats_use_case_id_use_cases_id_fk" FOREIGN KEY ("use_case_id") REFERENCES "public"."use_cases"("id") ON DELETE set null ON UPDATE no action;
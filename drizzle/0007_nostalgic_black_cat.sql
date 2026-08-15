CREATE TYPE "public"."coach_event_kind" AS ENUM('proposed', 'accepted', 'edited_then_saved', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."coach_intent" AS ENUM('wizard', 'roi_review', 'qa');--> statement-breakpoint
CREATE TABLE "coach_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"proposal_ref" text NOT NULL,
	"chat_id" uuid,
	"user_id" uuid NOT NULL,
	"kind" "coach_event_kind" NOT NULL,
	"door" "uc_source" NOT NULL,
	"use_case_id" uuid,
	"proposed" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"diff" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "coach_chats" ADD COLUMN "intent" "coach_intent" DEFAULT 'qa' NOT NULL;--> statement-breakpoint
ALTER TABLE "coach_events" ADD CONSTRAINT "coach_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coach_events" ADD CONSTRAINT "coach_events_use_case_id_use_cases_id_fk" FOREIGN KEY ("use_case_id") REFERENCES "public"."use_cases"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "coach_events_proposal_idx" ON "coach_events" USING btree ("proposal_ref");--> statement-breakpoint
CREATE INDEX "coach_events_created_idx" ON "coach_events" USING btree ("created_at");
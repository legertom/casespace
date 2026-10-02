CREATE TABLE "coach_failures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ref" text NOT NULL,
	"stage" text NOT NULL,
	"kind" text NOT NULL,
	"user_id" uuid,
	"chat_id" text,
	"intent" text,
	"model" text NOT NULL,
	"message_count" integer,
	"error_name" text,
	"error_message" text NOT NULL,
	"status_code" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "coach_failures" ADD CONSTRAINT "coach_failures_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "coach_failures_created_idx" ON "coach_failures" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "coach_failures_ref_idx" ON "coach_failures" USING btree ("ref");
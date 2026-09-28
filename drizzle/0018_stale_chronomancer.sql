CREATE TABLE "meeting_group_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_by" uuid NOT NULL,
	"method" text NOT NULL,
	"attendees" jsonb NOT NULL,
	"groups" jsonb NOT NULL,
	"report" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "meeting_group_runs" ADD CONSTRAINT "meeting_group_runs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "meeting_group_runs_created_idx" ON "meeting_group_runs" USING btree ("created_at");
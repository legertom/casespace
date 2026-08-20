CREATE TYPE "public"."url_kind" AS ENUM('live', 'github', 'claude', 'other');--> statement-breakpoint
ALTER TYPE "public"."notification_kind" ADD VALUE 'new_use_case';--> statement-breakpoint
CREATE TABLE "use_case_urls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"use_case_id" uuid NOT NULL,
	"kind" "url_kind" DEFAULT 'other' NOT NULL,
	"label" text,
	"url" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "use_case_urls" ADD CONSTRAINT "use_case_urls_use_case_id_use_cases_id_fk" FOREIGN KEY ("use_case_id") REFERENCES "public"."use_cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "use_case_url_case_idx" ON "use_case_urls" USING btree ("use_case_id");
CREATE TYPE "public"."audited_field" AS ENUM('in_program', 'owner', 'authors', 'elt_org', 'gate_named', 'gate_tool', 'gate_adoption', 'gate_owner');--> statement-breakpoint
CREATE TABLE "field_changes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"use_case_id" uuid NOT NULL,
	"field" "audited_field" NOT NULL,
	"from_value" text,
	"to_value" text,
	"changed_by_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "field_changes" ADD CONSTRAINT "field_changes_use_case_id_use_cases_id_fk" FOREIGN KEY ("use_case_id") REFERENCES "public"."use_cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "field_changes" ADD CONSTRAINT "field_changes_changed_by_id_users_id_fk" FOREIGN KEY ("changed_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
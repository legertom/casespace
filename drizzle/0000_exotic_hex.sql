CREATE TYPE "public"."approach" AS ENUM('prompt', 'automation', 'agentic');--> statement-breakpoint
CREATE TYPE "public"."department" AS ENUM('business_operations', 'product_design', 'engineering', 'people', 'css', 'mss', 'finance_legal');--> statement-breakpoint
CREATE TYPE "public"."lead_state" AS ENUM('assigned', 'unassigned', 'pending');--> statement-breakpoint
CREATE TYPE "public"."roi_status" AS ENUM('not_yet_measurable', 'in_progress', 'complete');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('viewer', 'contributor', 'admin');--> statement-breakpoint
CREATE TYPE "public"."success_met" AS ENUM('yes', 'no', 'not_yet');--> statement-breakpoint
CREATE TYPE "public"."uc_source" AS ENUM('form', 'wizard', 'notes', 'api', 'mcp');--> statement-breakpoint
CREATE TYPE "public"."uc_status" AS ENUM('in_discovery', 'approved_by_fl', 'under_construction', 'in_testing', 'launched', 'qualified');--> statement-breakpoint
CREATE TABLE "ai_lead_teams" (
	"lead_id" uuid NOT NULL,
	"team_id" uuid NOT NULL,
	CONSTRAINT "ai_lead_teams_lead_id_team_id_pk" PRIMARY KEY("lead_id","team_id")
);
--> statement-breakpoint
CREATE TABLE "ai_leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_unverified" boolean DEFAULT true NOT NULL,
	"department" "department" NOT NULL,
	"state" "lead_state" DEFAULT 'assigned' NOT NULL,
	"person_id" uuid,
	"user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_leads_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "ai_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"feature" text NOT NULL,
	"model" text NOT NULL,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "allowed_login_emails" (
	"email" text PRIMARY KEY NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coach_chats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text DEFAULT 'New conversation' NOT NULL,
	"messages" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "elt_orgs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"owner_person_id" uuid,
	"target" integer DEFAULT 0 NOT NULL,
	"departments" "department"[] DEFAULT '{}' NOT NULL,
	"note" text,
	"sort" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "elt_orgs_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "pats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"token_hash" text NOT NULL,
	"token_prefix" text NOT NULL,
	"last_used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "pats_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "people" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"title" text,
	"hris_department" text,
	"site" text,
	"level" integer,
	"reports_to_id" uuid,
	"reports_to_name" text,
	"direct_reports" integer DEFAULT 0 NOT NULL,
	"total_reports" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"week_start" date NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"model" text,
	"generated_at" timestamp with time zone,
	"edited_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "posts_week_start_unique" UNIQUE("week_start")
);
--> statement-breakpoint
CREATE TABLE "pulse_metrics" (
	"key" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"baseline_value" double precision NOT NULL,
	"baseline_date" date NOT NULL,
	"target_value" double precision NOT NULL,
	"unit" text DEFAULT '%' NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pulse_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"metric_key" text NOT NULL,
	"value" double precision NOT NULL,
	"taken_on" date NOT NULL,
	"entered_by_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "status_changes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"use_case_id" uuid NOT NULL,
	"from_status" "uc_status",
	"to_status" "uc_status" NOT NULL,
	"changed_by_id" uuid,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"department" "department" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "use_case_authors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"use_case_id" uuid NOT NULL,
	"person_id" uuid,
	"user_id" uuid,
	"display_name" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "use_cases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"department" "department",
	"team_id" uuid,
	"elt_org_id" uuid,
	"owner_person_id" uuid,
	"owner_user_id" uuid,
	"owner_name" text,
	"ai_tools" text[] DEFAULT '{}' NOT NULL,
	"approach" "approach",
	"source" "uc_source" DEFAULT 'form' NOT NULL,
	"current_steps" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"rating_frequency" smallint,
	"rating_pain" smallint,
	"rating_data_availability" smallint,
	"rating_risk" smallint,
	"rating_ownership_clarity" smallint,
	"rating_evaluation_clarity" smallint,
	"rating_maintenance_burden" smallint,
	"functional_leader_success" text,
	"gate_named" boolean DEFAULT false NOT NULL,
	"gate_tool" boolean DEFAULT false NOT NULL,
	"gate_adoption" boolean DEFAULT false NOT NULL,
	"adoption_evidence" text,
	"gate_owner" boolean DEFAULT false NOT NULL,
	"success_criterion" text,
	"success_criterion_met" "success_met" DEFAULT 'not_yet' NOT NULL,
	"baseline_metric" text,
	"baseline_value" double precision,
	"baseline_unit" text,
	"post_value" double precision,
	"measurement_method" text,
	"net_impact_statement" text,
	"is_positive" boolean,
	"roi_status" "roi_status" DEFAULT 'not_yet_measurable' NOT NULL,
	"revisit_on" date,
	"status" "uc_status" DEFAULT 'in_discovery' NOT NULL,
	"qualified_at" timestamp with time zone,
	"approved_by_id" uuid,
	"rejection_reason" text,
	"created_by_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "user_emails" (
	"email" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"primary_email" text NOT NULL,
	"role" "role" DEFAULT 'viewer' NOT NULL,
	"image" text,
	"person_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_primary_email_unique" UNIQUE("primary_email")
);
--> statement-breakpoint
ALTER TABLE "ai_lead_teams" ADD CONSTRAINT "ai_lead_teams_lead_id_ai_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."ai_leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_lead_teams" ADD CONSTRAINT "ai_lead_teams_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_leads" ADD CONSTRAINT "ai_leads_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_leads" ADD CONSTRAINT "ai_leads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_usage" ADD CONSTRAINT "ai_usage_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coach_chats" ADD CONSTRAINT "coach_chats_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "elt_orgs" ADD CONSTRAINT "elt_orgs_owner_person_id_people_id_fk" FOREIGN KEY ("owner_person_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pats" ADD CONSTRAINT "pats_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pulse_snapshots" ADD CONSTRAINT "pulse_snapshots_metric_key_pulse_metrics_key_fk" FOREIGN KEY ("metric_key") REFERENCES "public"."pulse_metrics"("key") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pulse_snapshots" ADD CONSTRAINT "pulse_snapshots_entered_by_id_users_id_fk" FOREIGN KEY ("entered_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "status_changes" ADD CONSTRAINT "status_changes_use_case_id_use_cases_id_fk" FOREIGN KEY ("use_case_id") REFERENCES "public"."use_cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "status_changes" ADD CONSTRAINT "status_changes_changed_by_id_users_id_fk" FOREIGN KEY ("changed_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "use_case_authors" ADD CONSTRAINT "use_case_authors_use_case_id_use_cases_id_fk" FOREIGN KEY ("use_case_id") REFERENCES "public"."use_cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "use_case_authors" ADD CONSTRAINT "use_case_authors_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "use_case_authors" ADD CONSTRAINT "use_case_authors_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "use_cases" ADD CONSTRAINT "use_cases_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "use_cases" ADD CONSTRAINT "use_cases_elt_org_id_elt_orgs_id_fk" FOREIGN KEY ("elt_org_id") REFERENCES "public"."elt_orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "use_cases" ADD CONSTRAINT "use_cases_owner_person_id_people_id_fk" FOREIGN KEY ("owner_person_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "use_cases" ADD CONSTRAINT "use_cases_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "use_cases" ADD CONSTRAINT "use_cases_approved_by_id_users_id_fk" FOREIGN KEY ("approved_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "use_cases" ADD CONSTRAINT "use_cases_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_emails" ADD CONSTRAINT "user_emails_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "people_name_idx" ON "people" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "pulse_metric_date_idx" ON "pulse_snapshots" USING btree ("metric_key","taken_on");--> statement-breakpoint
CREATE UNIQUE INDEX "teams_name_dept_idx" ON "teams" USING btree ("name","department");
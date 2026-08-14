ALTER TYPE "public"."uc_status" ADD VALUE 'confirmed_positive_roi';--> statement-breakpoint
ALTER TABLE "use_cases" ADD COLUMN "roi_confirmed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "use_cases" ADD COLUMN "roi_confirmed_by_id" uuid;--> statement-breakpoint
ALTER TABLE "use_cases" ADD CONSTRAINT "use_cases_roi_confirmed_by_id_users_id_fk" FOREIGN KEY ("roi_confirmed_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
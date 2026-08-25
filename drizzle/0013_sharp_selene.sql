ALTER TYPE "public"."role" ADD VALUE 'employee';--> statement-breakpoint
ALTER TABLE "use_cases" ADD COLUMN "in_program" boolean DEFAULT true NOT NULL;
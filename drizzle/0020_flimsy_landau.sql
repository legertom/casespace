CREATE TYPE "public"."baseline_period" AS ENUM('week', 'month', 'quarter', 'year');--> statement-breakpoint
CREATE TYPE "public"."value_type" AS ENUM('time_saved', 'revenue');--> statement-breakpoint
ALTER TABLE "use_cases" ADD COLUMN "value_type" "value_type";--> statement-breakpoint
ALTER TABLE "use_cases" ADD COLUMN "baseline_period" "baseline_period";--> statement-breakpoint
ALTER TABLE "use_cases" ADD COLUMN "baseline_estimated" boolean;--> statement-breakpoint
ALTER TABLE "use_cases" ADD COLUMN "expected_value" double precision;--> statement-breakpoint
ALTER TABLE "use_cases" ADD COLUMN "maintenance_hours_per_year" double precision;
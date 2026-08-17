CREATE TYPE "public"."pipeline_chart" AS ENUM('conversion', 'platforms');--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "pipeline_chart" "pipeline_chart" DEFAULT 'conversion' NOT NULL;
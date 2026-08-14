ALTER TABLE "use_cases" ADD COLUMN "approaches" "approach"[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
-- Carry the single approach over before the old column goes; a record that had
-- one keeps it, and one that had none starts empty ("not sure yet").
UPDATE "use_cases" SET "approaches" = ARRAY["approach"] WHERE "approach" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "use_cases" DROP COLUMN "approach";

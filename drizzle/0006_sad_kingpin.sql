CREATE TYPE "public"."link_kind" AS ENUM('builds_on', 'duplicates', 'relates_to');--> statement-breakpoint
ALTER TYPE "public"."notification_kind" ADD VALUE 'link';--> statement-breakpoint
CREATE TABLE "use_case_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_use_case_id" uuid NOT NULL,
	"to_use_case_id" uuid NOT NULL,
	"kind" "link_kind" NOT NULL,
	"created_by_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notifications" ALTER COLUMN "comment_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "link_id" uuid;--> statement-breakpoint
ALTER TABLE "use_case_links" ADD CONSTRAINT "use_case_links_from_use_case_id_use_cases_id_fk" FOREIGN KEY ("from_use_case_id") REFERENCES "public"."use_cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "use_case_links" ADD CONSTRAINT "use_case_links_to_use_case_id_use_cases_id_fk" FOREIGN KEY ("to_use_case_id") REFERENCES "public"."use_cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "use_case_links" ADD CONSTRAINT "use_case_links_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "use_case_link_pair_idx" ON "use_case_links" USING btree ("from_use_case_id","to_use_case_id");--> statement-breakpoint
CREATE INDEX "use_case_link_to_idx" ON "use_case_links" USING btree ("to_use_case_id");--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_link_id_use_case_links_id_fk" FOREIGN KEY ("link_id") REFERENCES "public"."use_case_links"("id") ON DELETE cascade ON UPDATE no action;
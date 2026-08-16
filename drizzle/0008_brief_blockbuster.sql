CREATE TYPE "public"."post_revision_reason" AS ENUM('regenerated', 'edited');--> statement-breakpoint
CREATE TABLE "post_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"model" text,
	"generated_at" timestamp with time zone,
	"edited_at" timestamp with time zone,
	"reason" "post_revision_reason" NOT NULL,
	"replaced_by_id" uuid,
	"replaced_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "post_revisions" ADD CONSTRAINT "post_revisions_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_revisions" ADD CONSTRAINT "post_revisions_replaced_by_id_users_id_fk" FOREIGN KEY ("replaced_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "post_revision_post_idx" ON "post_revisions" USING btree ("post_id");
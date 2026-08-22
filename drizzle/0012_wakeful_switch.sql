CREATE TABLE "ai_lead_monthly_syncs" (
	"lead_id" uuid NOT NULL,
	"month" date NOT NULL,
	"completed_by_id" uuid NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_lead_monthly_syncs_lead_id_month_pk" PRIMARY KEY("lead_id","month")
);
--> statement-breakpoint
ALTER TABLE "ai_lead_monthly_syncs" ADD CONSTRAINT "ai_lead_monthly_syncs_lead_id_ai_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."ai_leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_lead_monthly_syncs" ADD CONSTRAINT "ai_lead_monthly_syncs_completed_by_id_users_id_fk" FOREIGN KEY ("completed_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
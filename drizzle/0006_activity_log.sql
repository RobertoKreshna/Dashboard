CREATE TABLE "activity_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"actor" text NOT NULL,
	"action" text NOT NULL,
	"entity" text NOT NULL,
	"entity_id" text NOT NULL,
	"summary" text NOT NULL
);
--> statement-breakpoint
CREATE INDEX "activity_log_at_idx" ON "activity_log" USING btree ("at");--> statement-breakpoint
ALTER TABLE "activity_log" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
-- Written only by the app's server (direct connection); the API roles may at most read it, and only as staff.
CREATE POLICY "staff can read" ON public.activity_log FOR SELECT TO authenticated
  USING ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'staff');
--> statement-breakpoint
REVOKE ALL ON public.activity_log FROM anon, authenticated;
--> statement-breakpoint
GRANT SELECT ON public.activity_log TO authenticated;

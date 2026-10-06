-- Staff-only access ------------------------------------------------------------------------------------------
-- Until now every signed-in ("authenticated") user had full access, and Supabase allows open sign-ups, so anyone
-- could register and read/edit everything through the REST API. Access now requires app_metadata.role = 'staff',
-- which only the service-role key can set (see scripts/add-staff.ts).
DROP POLICY IF EXISTS "staff full access" ON public.sales_codes;
--> statement-breakpoint
DROP POLICY IF EXISTS "staff full access" ON public.facilities;
--> statement-breakpoint
DROP POLICY IF EXISTS "staff full access" ON public.listings;
--> statement-breakpoint
DROP POLICY IF EXISTS "staff full access" ON public.listing_photos;
--> statement-breakpoint
DROP POLICY IF EXISTS "staff full access" ON public.deals;
--> statement-breakpoint
CREATE POLICY "staff full access" ON public.sales_codes FOR ALL TO authenticated
  USING ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'staff')
  WITH CHECK ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'staff');
--> statement-breakpoint
CREATE POLICY "staff full access" ON public.facilities FOR ALL TO authenticated
  USING ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'staff')
  WITH CHECK ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'staff');
--> statement-breakpoint
CREATE POLICY "staff full access" ON public.listings FOR ALL TO authenticated
  USING ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'staff')
  WITH CHECK ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'staff');
--> statement-breakpoint
CREATE POLICY "staff full access" ON public.listing_photos FOR ALL TO authenticated
  USING ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'staff')
  WITH CHECK ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'staff');
--> statement-breakpoint
CREATE POLICY "staff full access" ON public.deals FOR ALL TO authenticated
  USING ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'staff')
  WITH CHECK ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'staff');
--> statement-breakpoint

-- Photos: anyone can read; only staff can write ---------------------------------------------------------------
DROP POLICY IF EXISTS "staff can upload listing photos" ON storage.objects;
--> statement-breakpoint
DROP POLICY IF EXISTS "staff can update listing photos" ON storage.objects;
--> statement-breakpoint
DROP POLICY IF EXISTS "staff can delete listing photos" ON storage.objects;
--> statement-breakpoint
CREATE POLICY "staff can upload listing photos" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'listing-photos' AND (select auth.jwt() -> 'app_metadata' ->> 'role') = 'staff');
--> statement-breakpoint
CREATE POLICY "staff can update listing photos" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'listing-photos' AND (select auth.jwt() -> 'app_metadata' ->> 'role') = 'staff');
--> statement-breakpoint
CREATE POLICY "staff can delete listing photos" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'listing-photos' AND (select auth.jwt() -> 'app_metadata' ->> 'role') = 'staff');
--> statement-breakpoint

-- Least privilege: RLS does not cover TRUNCATE/TRIGGER/REFERENCES, and the views are read-only -------------------
REVOKE TRUNCATE, TRIGGER, REFERENCES ON public.sales_codes, public.facilities, public.listings, public.listing_photos, public.deals FROM anon, authenticated;
--> statement-breakpoint
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES ON public.public_listings, public.public_listing_photos FROM anon, authenticated;

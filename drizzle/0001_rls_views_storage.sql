-- Public read-only views --------------------------------------------------
-- Views run with the owner's rights, so anon can read them without any access
-- to the underlying tables. They deliberately omit: listings.notes, agent
-- phone/email, and everything about deals.
CREATE OR REPLACE VIEW public.public_listings AS
SELECT
  l.id, l.title, l.listing_type, l.price, l.rental_period, l.property_type,
  l.address, l.village, l.district, l.city, l.province, l.postal_code,
  l.land_area, l.building_area, l.bedrooms, l.bathrooms, l.facilities,
  l.electricity_watts, l.sales_code, s.full_name AS agent_name, l.status,
  (SELECT p.path FROM public.listing_photos p
     WHERE p.listing_id = l.id
     ORDER BY p.is_cover DESC, p."position" ASC, p.created_at ASC
     LIMIT 1) AS cover_path,
  l.created_at, l.updated_at
FROM public.listings l
JOIN public.sales_codes s ON s.code = l.sales_code;
--> statement-breakpoint
CREATE OR REPLACE VIEW public.public_listing_photos AS
SELECT id, listing_id, path, "position", is_cover FROM public.listing_photos;
--> statement-breakpoint

-- Row Level Security ------------------------------------------------------
ALTER TABLE public.sales_codes ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.facilities ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.listing_photos ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "staff full access" ON public.sales_codes FOR ALL TO authenticated USING (true) WITH CHECK (true);
--> statement-breakpoint
CREATE POLICY "staff full access" ON public.facilities FOR ALL TO authenticated USING (true) WITH CHECK (true);
--> statement-breakpoint
CREATE POLICY "staff full access" ON public.listings FOR ALL TO authenticated USING (true) WITH CHECK (true);
--> statement-breakpoint
CREATE POLICY "staff full access" ON public.listing_photos FOR ALL TO authenticated USING (true) WITH CHECK (true);
--> statement-breakpoint
CREATE POLICY "staff full access" ON public.deals FOR ALL TO authenticated USING (true) WITH CHECK (true);
--> statement-breakpoint

-- anon: no table access at all, SELECT on the two views only --------------
REVOKE ALL ON public.sales_codes, public.facilities, public.listings, public.listing_photos, public.deals FROM anon;
--> statement-breakpoint
REVOKE ALL ON public.public_listings, public.public_listing_photos FROM anon;
--> statement-breakpoint
GRANT SELECT ON public.public_listings, public.public_listing_photos TO anon, authenticated;
--> statement-breakpoint

-- Storage: one public-read bucket, staff-only writes ----------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('listing-photos', 'listing-photos', true, 10485760,
        ARRAY['image/jpeg','image/png','image/webp','image/gif'])
ON CONFLICT (id) DO UPDATE SET public = true;
--> statement-breakpoint
CREATE POLICY "listing photos are publicly readable" ON storage.objects
  FOR SELECT TO anon, authenticated USING (bucket_id = 'listing-photos');
--> statement-breakpoint
CREATE POLICY "staff can upload listing photos" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'listing-photos');
--> statement-breakpoint
CREATE POLICY "staff can update listing photos" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'listing-photos');
--> statement-breakpoint
CREATE POLICY "staff can delete listing photos" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'listing-photos');

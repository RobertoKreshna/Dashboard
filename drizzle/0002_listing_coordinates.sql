ALTER TABLE "listings" ADD COLUMN "latitude" numeric(9, 6);--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "longitude" numeric(9, 6);--> statement-breakpoint
-- Re-create the public view with coordinates appended (CREATE OR REPLACE may only add columns at the end).
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
  l.created_at, l.updated_at,
  l.latitude, l.longitude
FROM public.listings l
JOIN public.sales_codes s ON s.code = l.sales_code;

ALTER TABLE "deals" ADD COLUMN "listing_sales_code" text;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_listing_sales_code_sales_codes_code_fk" FOREIGN KEY ("listing_sales_code") REFERENCES "public"."sales_codes"("code") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
-- Existing linked deals: record the agent who held the listing.
UPDATE "deals" SET "listing_sales_code" = "listings"."sales_code" FROM "listings" WHERE "deals"."listing_id" = "listings"."id";

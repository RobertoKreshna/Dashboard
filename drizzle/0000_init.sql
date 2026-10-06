CREATE TYPE "public"."deal_source" AS ENUM('listing', 'manual');--> statement-breakpoint
CREATE TYPE "public"."deal_type" AS ENUM('sale', 'rent');--> statement-breakpoint
CREATE TYPE "public"."listing_status" AS ENUM('available', 'reserved', 'sold', 'rented');--> statement-breakpoint
CREATE TYPE "public"."listing_type" AS ENUM('sell', 'rent');--> statement-breakpoint
CREATE TYPE "public"."property_type" AS ENUM('house', 'apartment', 'land', 'ruko', 'office', 'warehouse', 'villa', 'other');--> statement-breakpoint
CREATE TYPE "public"."rental_period" AS ENUM('month', 'year');--> statement-breakpoint
CREATE SEQUENCE "public"."deal_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint
CREATE SEQUENCE "public"."listing_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint
CREATE TABLE "deals" (
	"id" text PRIMARY KEY DEFAULT 'DL-' || lpad(nextval('deal_seq')::text, 4, '0') NOT NULL,
	"listing_id" text,
	"source" "deal_source" NOT NULL,
	"deal_type" "deal_type" NOT NULL,
	"property_type" "property_type" NOT NULL,
	"address" text NOT NULL,
	"village" text,
	"district" text,
	"city" text NOT NULL,
	"province" text,
	"listing_price" bigint,
	"final_price" bigint NOT NULL,
	"deal_date" date NOT NULL,
	"buyer_name" text NOT NULL,
	"buyer_phone" text,
	"contract_start" date,
	"contract_end" date,
	"sales_code" text NOT NULL,
	"commission_percent" numeric(6, 3),
	"commission_amount" bigint,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "facilities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "facilities_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "listing_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" text NOT NULL,
	"path" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"is_cover" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "listings" (
	"id" text PRIMARY KEY DEFAULT 'LST-' || lpad(nextval('listing_seq')::text, 4, '0') NOT NULL,
	"title" text NOT NULL,
	"listing_type" "listing_type" NOT NULL,
	"price" bigint NOT NULL,
	"rental_period" "rental_period",
	"property_type" "property_type" NOT NULL,
	"address" text NOT NULL,
	"village" text NOT NULL,
	"district" text NOT NULL,
	"city" text NOT NULL,
	"province" text NOT NULL,
	"postal_code" text,
	"land_area" numeric(12, 2),
	"building_area" numeric(12, 2),
	"bedrooms" integer DEFAULT 0 NOT NULL,
	"bathrooms" integer DEFAULT 0 NOT NULL,
	"facilities" text[] DEFAULT '{}'::text[] NOT NULL,
	"electricity_watts" integer,
	"sales_code" text NOT NULL,
	"status" "listing_status" DEFAULT 'available' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales_codes" (
	"code" text PRIMARY KEY NOT NULL,
	"full_name" text NOT NULL,
	"phone" text,
	"email" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_sales_code_sales_codes_code_fk" FOREIGN KEY ("sales_code") REFERENCES "public"."sales_codes"("code") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "listing_photos" ADD CONSTRAINT "listing_photos_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_sales_code_sales_codes_code_fk" FOREIGN KEY ("sales_code") REFERENCES "public"."sales_codes"("code") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "deals_date_idx" ON "deals" USING btree ("deal_date");--> statement-breakpoint
CREATE INDEX "deals_listing_idx" ON "deals" USING btree ("listing_id");--> statement-breakpoint
CREATE INDEX "deals_sales_code_idx" ON "deals" USING btree ("sales_code");--> statement-breakpoint
CREATE INDEX "listing_photos_listing_idx" ON "listing_photos" USING btree ("listing_id");--> statement-breakpoint
CREATE INDEX "listings_status_idx" ON "listings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "listings_city_idx" ON "listings" USING btree ("city");--> statement-breakpoint
CREATE INDEX "listings_sales_code_idx" ON "listings" USING btree ("sales_code");
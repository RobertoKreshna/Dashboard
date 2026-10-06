CREATE TYPE "public"."payment_type" AS ENUM('cash', 'bank');--> statement-breakpoint
ALTER TABLE "deals" ADD COLUMN "payment_type" "payment_type";--> statement-breakpoint
ALTER TABLE "deals" ADD COLUMN "bank_name" text;
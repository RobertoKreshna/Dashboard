"use server";

import { and, eq, ilike, ne, or, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { deals, listings, salesCodes } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { decimal, money, optStr, str, zodErrors } from "@/lib/form-utils";

export type DealFormState = { errors?: Record<string, string>; message?: string };

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date");

const base = z.object({
  listingId: z.string().nullable(),
  dealType: z.enum(["sale", "rent"], { error: "Choose Sale or Rent" }),
  propertyType: z.enum(
    ["house", "apartment", "land", "ruko", "office", "warehouse", "villa", "other"],
    { error: "Choose a property type" },
  ),
  address: z.string().min(1, "Address is required"),
  village: z.string().nullable(),
  district: z.string().nullable(),
  city: z.string().min(1, "City / regency is required"),
  province: z.string().nullable(),
  listingPrice: z.number().int().nonnegative().nullable(),
  finalPrice: z.number({ error: "Final price is required" }).int().positive("Final price must be greater than 0"),
  dealDate: date,
  buyerName: z.string().min(1, "Buyer / tenant name is required"),
  buyerPhone: z.string().nullable(),
  contractStart: date.nullable(),
  contractEnd: date.nullable(),
  salesCode: z.string().min(1, "Sales code is required"),
  paymentType: z.enum(["cash", "bank"], { error: "Choose Cash or Bank" }),
  bankName: z.string().max(60).nullable(),
  commissionMode: z.enum(["amount", "percent"]),
  commissionValue: z.number().min(0, "Cannot be negative").nullable(),
  notes: z.string().nullable(),
});

export async function saveDeal(_prev: DealFormState, fd: FormData): Promise<DealFormState> {
  await requireUser();
  const id = str(fd, "id");
  const listingId = optStr(fd, "listingId");
  const dealType = str(fd, "dealType");

  // For linked deals the property details come from the listing, not the form.
  let linked: typeof listings.$inferSelect | undefined;
  if (listingId) {
    [linked] = await db.select().from(listings).where(eq(listings.id, listingId));
    if (!linked) return { errors: { listingId: "Listing not found" } };
    const [other] = await db
      .select({ id: deals.id })
      .from(deals)
      .where(and(eq(deals.listingId, listingId), id ? ne(deals.id, id) : undefined))
      .limit(1);
    if (other) return { errors: { listingId: `${listingId} already has a deal (${other.id})` } };
  }

  const parsed = base
    .refine((v) => !!v.province, { path: ["province"], message: "Province is required" })
    .refine((v) => v.paymentType !== "bank" || !!v.bankName, { path: ["bankName"], message: "Choose the bank" })
    .refine((v) => v.dealType !== "rent" || v.contractStart, { path: ["contractStart"], message: "Contract start is required for rent" })
    .refine((v) => v.dealType !== "rent" || v.contractEnd, { path: ["contractEnd"], message: "Contract end is required for rent" })
    .refine((v) => !v.contractStart || !v.contractEnd || v.contractEnd >= v.contractStart, {
      path: ["contractEnd"],
      message: "End date must be after the start date",
    })
    .refine((v) => v.commissionMode !== "percent" || v.commissionValue === null || v.commissionValue <= 100, {
      path: ["commissionValue"],
      message: "Percentage can't exceed 100",
    })
    .safeParse({
      listingId,
      dealType,
      propertyType: linked?.propertyType ?? str(fd, "propertyType"),
      address: linked?.address ?? str(fd, "address"),
      village: linked ? linked.village : optStr(fd, "village"),
      district: linked ? linked.district : optStr(fd, "district"),
      city: linked?.city ?? str(fd, "city"),
      province: linked ? linked.province : optStr(fd, "province"),
      listingPrice: linked ? linked.price : money(fd, "listingPrice"),
      finalPrice: money(fd, "finalPrice") ?? undefined,
      dealDate: str(fd, "dealDate"),
      buyerName: str(fd, "buyerName"),
      buyerPhone: optStr(fd, "buyerPhone"),
      contractStart: dealType === "rent" ? optStr(fd, "contractStart") : null,
      contractEnd: dealType === "rent" ? optStr(fd, "contractEnd") : null,
      salesCode: str(fd, "salesCode"),
      paymentType: str(fd, "paymentType"),
      bankName: str(fd, "paymentType") === "bank" ? optStr(fd, "bankName") : null,
      commissionMode: str(fd, "commissionMode") === "percent" ? "percent" : "amount",
      commissionValue:
        str(fd, "commissionMode") === "percent" ? decimal(fd, "commissionValue") : money(fd, "commissionValue"),
      notes: optStr(fd, "notes"),
    });
  if (!parsed.success) return { errors: zodErrors(parsed.error.issues), message: "Please fix the highlighted fields." };
  const { commissionMode, commissionValue, ...v } = parsed.data;

  const [agent] = await db.select().from(salesCodes).where(eq(salesCodes.code, v.salesCode));
  if (!agent) return { errors: { salesCode: "Sales code not found" } };
  const [existing] = id ? await db.select().from(deals).where(eq(deals.id, id)) : [];
  if (!agent.isActive && existing?.salesCode !== v.salesCode) {
    return { errors: { salesCode: "This sales code is inactive" } };
  }

  const commissionPercent = commissionMode === "percent" ? commissionValue : null;
  const commissionAmount =
    commissionValue === null
      ? null
      : commissionMode === "percent"
        ? Math.round((v.finalPrice * commissionValue) / 100)
        : Math.round(commissionValue);

  const values = {
    ...v,
    source: (listingId ? "listing" : "manual") as "listing" | "manual",
    commissionPercent,
    commissionAmount,
  };

  await db.transaction(async (tx) => {
    if (existing) {
      await tx.update(deals).set(values).where(eq(deals.id, id));
    } else {
      await tx.insert(deals).values(values);
    }
    // Release the previous listing if the link moved or was removed.
    if (existing?.listingId && existing.listingId !== listingId) {
      await tx.update(listings).set({ status: "available" }).where(eq(listings.id, existing.listingId));
    }
    if (listingId) {
      await tx
        .update(listings)
        .set({ status: v.dealType === "sale" ? "sold" : "rented" })
        .where(eq(listings.id, listingId));
    }
  });

  revalidateAll();
  redirect("/deals");
}

export async function deleteDeal(id: string): Promise<{ error?: string }> {
  await requireUser();
  await db.transaction(async (tx) => {
    const [deal] = await tx.delete(deals).where(eq(deals.id, id)).returning();
    if (deal?.listingId) {
      await tx.update(listings).set({ status: "available" }).where(eq(listings.id, deal.listingId));
    }
  });
  revalidateAll();
  return {};
}

/** Searchable dropdown source: listings that don't have a deal yet. */
export async function searchListingsForDeal(q: string) {
  await requireUser();
  const like = `%${q.trim().replace(/[%_]/g, "\\$&")}%`;
  return db
    .select({
      id: listings.id,
      title: listings.title,
      city: listings.city,
      listingType: listings.listingType,
      price: listings.price,
    })
    .from(listings)
    .where(
      and(
        sql`not exists (select 1 from ${deals} d where d.listing_id = ${listings.id})`,
        q.trim() ? or(ilike(listings.id, like), ilike(listings.title, like), ilike(listings.address, like)) : undefined,
      ),
    )
    .orderBy(listings.id)
    .limit(15);
}

export async function getListingForDeal(id: string) {
  await requireUser();
  const [l] = await db.select().from(listings).where(eq(listings.id, id));
  return l ?? null;
}

function revalidateAll() {
  for (const p of ["/deals", "/listings", "/listings-public", "/"]) revalidatePath(p);
}

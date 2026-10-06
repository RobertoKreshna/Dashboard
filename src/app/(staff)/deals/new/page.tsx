import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { deals, listings, salesCodes } from "@/db/schema";
import { todayISO } from "@/lib/format";
import { PageHeader } from "@/components/common/page-header";
import { DealForm, type DealFormValues } from "@/components/deals/deal-form";

export const metadata = { title: "New deal" };

export default async function NewDealPage({
  searchParams,
}: {
  searchParams: Promise<{ listingId?: string }>;
}) {
  const { listingId } = await searchParams;
  const agents = await db.select().from(salesCodes).where(eq(salesCodes.isActive, true)).orderBy(asc(salesCodes.code));

  const initial: DealFormValues = {
    listingId: null,
    dealType: "sale",
    propertyType: "",
    address: "",
    village: "",
    district: "",
    city: "",
    province: "",
    listingPrice: null,
    finalPrice: null,
    dealDate: todayISO(),
    buyerName: "",
    buyerPhone: "",
    contractStart: "",
    contractEnd: "",
    salesCode: "",
    listingSalesCode: "",
    paymentType: "",
    bankName: "",
    commissionMode: "amount",
    commissionValue: null,
    notes: "",
  };

  let notice: string | null = null;
  if (listingId) {
    const [l] = await db.select().from(listings).where(eq(listings.id, listingId));
    const [existing] = l ? await db.select({ id: deals.id }).from(deals).where(eq(deals.listingId, listingId)).limit(1) : [];
    if (l && !existing) {
      Object.assign(initial, {
        listingId: l.id,
        dealType: l.listingType === "sell" ? "sale" : "rent",
        propertyType: l.propertyType,
        address: l.address,
        village: l.village,
        district: l.district,
        city: l.city,
        province: l.province,
        listingPrice: l.price,
        finalPrice: l.price,
        salesCode: l.salesCode,
        listingSalesCode: l.salesCode,
      });
    } else if (existing) {
      notice = `${listingId} already has a deal (${existing.id}).`;
    }
  }
  // The listing's agent may have been deactivated; keep them selectable.
  for (const code of [initial.salesCode, initial.listingSalesCode]) {
    if (code && !agents.some((a) => a.code === code)) {
      const [a] = await db.select().from(salesCodes).where(eq(salesCodes.code, code));
      if (a) agents.push(a);
    }
  }

  return (
    <>
      <PageHeader title="New deal" description={initial.listingId ? `Pre-filled from ${initial.listingId}.` : undefined} />
      {notice && <p className="mb-4 rounded-lg bg-brand-yellow/20 px-3 py-2 text-sm font-medium">{notice}</p>}
      <DealForm initial={initial} agents={agents} />
    </>
  );
}

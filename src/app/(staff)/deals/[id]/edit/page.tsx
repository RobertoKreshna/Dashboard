import { asc, eq, or } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { deals, salesCodes } from "@/db/schema";
import { PageHeader } from "@/components/common/page-header";
import { DealForm } from "@/components/deals/deal-form";

export const metadata = { title: "Edit deal" };

export default async function EditDealPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [d] = await db.select().from(deals).where(eq(deals.id, id));
  if (!d) notFound();
  const agents = await db
    .select()
    .from(salesCodes)
    .where(or(eq(salesCodes.isActive, true), eq(salesCodes.code, d.salesCode), eq(salesCodes.code, d.listingSalesCode ?? d.salesCode)))
    .orderBy(asc(salesCodes.code));

  return (
    <>
      <PageHeader title={`Edit ${d.id}`} />
      <DealForm
        agents={agents}
        initial={{
          id: d.id,
          listingId: d.listingId,
          dealType: d.dealType,
          propertyType: d.propertyType,
          address: d.address,
          village: d.village ?? "",
          district: d.district ?? "",
          city: d.city,
          province: d.province ?? "",
          listingPrice: d.listingPrice,
          finalPrice: d.finalPrice,
          dealDate: d.dealDate,
          buyerName: d.buyerName,
          buyerPhone: d.buyerPhone ?? "",
          contractStart: d.contractStart ?? "",
          contractEnd: d.contractEnd ?? "",
          salesCode: d.salesCode,
          listingSalesCode: d.listingSalesCode ?? "",
          paymentType: d.paymentType ?? "",
          bankName: d.bankName ?? "",
          commissionMode: d.commissionPercent !== null ? "percent" : "amount",
          commissionValue: d.commissionPercent ?? d.commissionAmount,
          notes: d.notes ?? "",
        }}
      />
    </>
  );
}

import { asc, ilike, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { deals, listings, salesCodes } from "@/db/schema";
import { PageHeader } from "@/components/common/page-header";
import { SalesCodeManager } from "@/components/sales/sales-code-manager";

export const metadata = { title: "Sales Codes" };

export default async function SalesCodesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const like = `%${q.trim()}%`;
  const rows = await db
    .select({
      code: salesCodes.code,
      fullName: salesCodes.fullName,
      phone: salesCodes.phone,
      email: salesCodes.email,
      isActive: salesCodes.isActive,
      updatedAt: salesCodes.updatedAt,
      listingCount: sql<number>`(select count(*)::int from ${listings} l where l.sales_code = sales_codes.code)`,
      dealCount: sql<number>`(select count(*)::int from ${deals} d where d.sales_code = sales_codes.code)`,
    })
    .from(salesCodes)
    .where(
      q.trim()
        ? or(
            ilike(salesCodes.code, like),
            ilike(salesCodes.fullName, like),
            ilike(salesCodes.email, like),
            ilike(salesCodes.phone, like),
          )
        : undefined,
    )
    .orderBy(asc(salesCodes.code));

  return (
    <>
      <PageHeader title="Sales Codes" description="Sales agents and the codes used across listings and deals." />
      <SalesCodeManager rows={rows.map((r) => ({ ...r, updatedAt: r.updatedAt.toISOString() }))} initialQuery={q} />
    </>
  );
}

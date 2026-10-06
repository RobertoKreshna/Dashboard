import { and, asc, gte, ilike, lt, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { deals, listings, salesCodes } from "@/db/schema";
import { commissionSplit } from "@/lib/commission";
import { dealYears, parsePeriod } from "@/lib/period";
import { PageHeader } from "@/components/common/page-header";
import { SalesCodeManager } from "@/components/sales/sales-code-manager";

export const metadata = { title: "Sales Codes" };

const SORTS = ["code", "name", "commission", "deals", "listings"] as const;

export default async function SalesCodesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const q = (Array.isArray(sp.q) ? sp.q[0] : sp.q) ?? "";
  const sort = (SORTS as readonly string[]).includes(String(sp.sort)) ? (String(sp.sort) as (typeof SORTS)[number]) : "code";
  const { period, year, month, range, label } = parsePeriod(sp);
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

  // Deals closed and commission earned in the chosen period. Commission follows the listed/sold split (lib/commission.ts).
  const periodDeals = await db
    .select({ amount: deals.commissionAmount, sold: deals.salesCode, listed: deals.listingSalesCode })
    .from(deals)
    .where(and(range.gte ? gte(deals.dealDate, range.gte) : undefined, range.lt ? lt(deals.dealDate, range.lt) : undefined));
  const stats = new Map<string, { deals: number; commission: number }>();
  const stat = (code: string) => stats.get(code) ?? stats.set(code, { deals: 0, commission: 0 }).get(code)!;
  for (const d of periodDeals) {
    stat(d.sold).deals += 1;
    if (d.amount === null) continue;
    const split = commissionSplit(d.amount, d.listed, d.sold);
    stat(d.sold).commission += split.sold;
    if (d.listed && split.listed) stat(d.listed).commission += split.listed;
  }

  const data = rows.map((r) => ({
    ...r,
    updatedAt: r.updatedAt.toISOString(),
    dealCount: stats.get(r.code)?.deals ?? 0,
    commission: stats.get(r.code)?.commission ?? 0,
  }));
  const by = {
    code: (a: (typeof data)[number], b: (typeof data)[number]) => a.code.localeCompare(b.code),
    name: (a: (typeof data)[number], b: (typeof data)[number]) => a.fullName.localeCompare(b.fullName),
    commission: (a: (typeof data)[number], b: (typeof data)[number]) => b.commission - a.commission || a.code.localeCompare(b.code),
    deals: (a: (typeof data)[number], b: (typeof data)[number]) => b.dealCount - a.dealCount || a.code.localeCompare(b.code),
    listings: (a: (typeof data)[number], b: (typeof data)[number]) => b.listingCount - a.listingCount || a.code.localeCompare(b.code),
  }[sort];
  data.sort(by);
  const years = await dealYears(year);

  return (
    <>
      <PageHeader title="Sales Codes" description="Sales agents and the codes used across listings and deals." />
      <SalesCodeManager rows={data} initialQuery={q} sort={sort} period={{ period, month, year, years, label }} />
    </>
  );
}

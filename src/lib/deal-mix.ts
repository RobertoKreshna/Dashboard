import "server-only";
import { and, count, gte, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { deals } from "@/db/schema";

export type MixRow = { name: string; value: number; n: number };
export type DealMix = { total: number; types: { sale: MixRow; rent: MixRow }; payments: MixRow[] };

const empty = (name: string): MixRow => ({ name, value: 0, n: 0 });

/** Deal value and count for a period, split by sale / rent and by payment type (Cash, each bank, Not recorded). */
export async function getDealMix(gteDate?: string, ltDate?: string): Promise<DealMix> {
  const where = and(gteDate ? gte(deals.dealDate, gteDate) : undefined, ltDate ? lt(deals.dealDate, ltDate) : undefined);
  const value = sql<number>`coalesce(sum(${deals.finalPrice}), 0)::float8`;
  // Same labels as the trend chart's "By payment type" lines, so colours match.
  const payment = sql<string>`case when ${deals.paymentType} = 'cash' then 'Cash'
               when ${deals.paymentType} = 'bank' then coalesce(${deals.bankName}, 'Bank (unspecified)')
               else 'Not recorded' end`;

  const [typeRows, paymentRows] = await Promise.all([
    db.select({ name: deals.dealType, value, n: count() }).from(deals).where(where).groupBy(deals.dealType),
    db.select({ name: payment, value, n: count() }).from(deals).where(where).groupBy(sql`1`),
  ]);

  const types = { sale: empty("Sale"), rent: empty("Rent") };
  for (const r of typeRows) types[r.name === "rent" ? "rent" : "sale"] = { name: r.name === "rent" ? "Rent" : "Sale", value: r.value, n: r.n };
  const payments = paymentRows.sort((a, b) => b.value - a.value);
  return { total: types.sale.value + types.rent.value, types, payments };
}

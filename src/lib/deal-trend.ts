import "server-only";
import { and, count, gte, lt, max, min, sql } from "drizzle-orm";
import { db } from "@/db";
import { deals, salesCodes } from "@/db/schema";

export type TrendBy = "total" | "payment" | "sales";
export type Granularity = "day" | "month";

export type DealTrend = {
  granularity: Granularity;
  /** One entry per day / month in the period, in order ("2026-10-03" or "2026-10"), including empty ones. */
  buckets: string[];
  series: { name: string; values: number[]; counts: number[]; total: number }[];
};

const pad = (n: number) => String(n).padStart(2, "0");

/** Deal value (sum of final price) over time for the chosen period, split by total / payment type (per bank) / sales code. */
export async function getDealTrend(opts: {
  period: "month" | "year" | "all";
  year: number;
  month: number; // 1-12
  by: TrendBy;
}): Promise<DealTrend> {
  const { period, year, month, by } = opts;
  const granularity: Granularity = period === "month" ? "day" : "month";

  let gteDate: string | undefined;
  let ltDate: string | undefined;
  let buckets: string[] = [];
  if (period === "month") {
    gteDate = `${year}-${pad(month)}-01`;
    ltDate = month === 12 ? `${year + 1}-01-01` : `${year}-${pad(month + 1)}-01`;
    const days = new Date(year, month, 0).getDate();
    buckets = Array.from({ length: days }, (_, i) => `${year}-${pad(month)}-${pad(i + 1)}`);
  } else if (period === "year") {
    gteDate = `${year}-01-01`;
    ltDate = `${year + 1}-01-01`;
    buckets = Array.from({ length: 12 }, (_, i) => `${year}-${pad(i + 1)}`);
  } else {
    const [{ lo, hi }] = await db.select({ lo: min(deals.dealDate), hi: max(deals.dealDate) }).from(deals);
    if (lo && hi) {
      let y = Number(lo.slice(0, 4)), m = Number(lo.slice(5, 7));
      const endY = Number(hi.slice(0, 4)), endM = Number(hi.slice(5, 7));
      while (y < endY || (y === endY && m <= endM)) {
        buckets.push(`${y}-${pad(m)}`);
        if (++m > 12) { m = 1; y++; }
      }
    }
  }

  const bucketExpr = granularity === "day" ? sql`to_char(${deals.dealDate}, 'YYYY-MM-DD')` : sql`to_char(${deals.dealDate}, 'YYYY-MM')`;
  const seriesExpr =
    by === "payment"
      ? sql`case when ${deals.paymentType} = 'cash' then 'Cash'
               when ${deals.paymentType} = 'bank' then coalesce(${deals.bankName}, 'Bank (unspecified)')
               else 'Not recorded' end`
      : by === "sales"
        ? sql`${deals.salesCode}`
        : sql`'Total'`;

  const rows = await db
    .select({
      bucket: sql<string>`${bucketExpr}`,
      series: sql<string>`${seriesExpr}`,
      value: sql<number>`coalesce(sum(${deals.finalPrice}), 0)::float8`,
      n: count(),
    })
    .from(deals)
    .where(and(gteDate ? gte(deals.dealDate, gteDate) : undefined, ltDate ? lt(deals.dealDate, ltDate) : undefined))
    .groupBy(sql`1, 2`);

  const names = new Map<string, string>();
  if (by === "sales") {
    for (const s of await db.select({ code: salesCodes.code, name: salesCodes.fullName }).from(salesCodes)) {
      names.set(s.code, `${s.code} · ${s.name.split(" ")[0]}`);
    }
  }

  const index = new Map(buckets.map((b, i) => [b, i]));
  const bySeries = new Map<string, { values: number[]; counts: number[]; total: number }>();
  for (const r of rows) {
    const i = index.get(r.bucket);
    if (i === undefined) continue;
    const label = names.get(r.series) ?? r.series;
    const s = bySeries.get(label) ?? { values: buckets.map(() => 0), counts: buckets.map(() => 0), total: 0 };
    s.values[i] += r.value;
    s.counts[i] += r.n;
    s.total += r.value;
    bySeries.set(label, s);
  }

  // Biggest lines first. Every payment type / bank / salesperson gets its own line (nothing is folded away).
  const ranked = [...bySeries.entries()].sort((a, b) => b[1].total - a[1].total);

  return { granularity, buckets, series: ranked.map(([name, s]) => ({ name, ...s })) };
}

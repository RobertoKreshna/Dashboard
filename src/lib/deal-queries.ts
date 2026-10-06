import "server-only";
import { and, count, desc, eq, gte, ilike, lte, or, sql, sum, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { deals } from "@/db/schema";

export const DEAL_PAGE_SIZE = 25;

export type DealFilters = {
  q: string;
  from: string;
  to: string;
  type: string;
  source: string;
  salesCode: string;
  city: string;
  payment: string;
  bank: string;
  page: number;
};

type Params = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const isoDate = (s: string) => (/^\d{4}-\d{2}-\d{2}$/.test(s) ? s : "");

export function parseDealFilters(sp: Params): DealFilters {
  return {
    q: one(sp.q).trim().slice(0, 100),
    from: isoDate(one(sp.from)),
    to: isoDate(one(sp.to)),
    type: one(sp.type),
    source: one(sp.source),
    salesCode: one(sp.salesCode).slice(0, 40),
    city: one(sp.city).slice(0, 100),
    payment: one(sp.payment),
    bank: one(sp.bank).slice(0, 100),
    page: Math.min(10_000, Math.max(1, Math.trunc(Number(one(sp.page))) || 1)),
  };
}

function where(f: DealFilters): SQL | undefined {
  const c: (SQL | undefined)[] = [];
  if (f.q) {
    const like = `%${f.q.replace(/[%_]/g, "\\$&")}%`;
    c.push(or(ilike(deals.buyerName, like), ilike(deals.listingId, like), ilike(deals.id, like)));
  }
  if (f.from) c.push(gte(deals.dealDate, f.from));
  if (f.to) c.push(lte(deals.dealDate, f.to));
  if (f.type === "sale" || f.type === "rent") c.push(eq(deals.dealType, f.type));
  if (f.source === "listing" || f.source === "manual") c.push(eq(deals.source, f.source));
  if (f.salesCode) c.push(eq(deals.salesCode, f.salesCode));
  if (f.city) c.push(eq(deals.city, f.city));
  if (f.payment === "cash" || f.payment === "bank") c.push(eq(deals.paymentType, f.payment));
  if (f.bank) c.push(eq(deals.bankName, f.bank));
  return and(...c);
}

export async function queryDeals(f: DealFilters, opts: { all?: boolean } = {}) {
  const w = where(f);
  const base = db.select().from(deals).where(w).orderBy(desc(deals.dealDate), desc(deals.id));
  const rowsP = opts.all ? base : base.limit(DEAL_PAGE_SIZE).offset((f.page - 1) * DEAL_PAGE_SIZE);
  const [rows, [totals]] = await Promise.all([
    rowsP,
    db
      .select({
        n: count(),
        value: sql<number>`coalesce(${sum(deals.finalPrice)}, 0)::float8`,
        commission: sql<number>`coalesce(${sum(deals.commissionAmount)}, 0)::float8`,
      })
      .from(deals)
      .where(w),
  ]);
  return {
    rows,
    totals: { count: totals.n, value: totals.value, commission: totals.commission },
    pages: Math.max(1, Math.ceil(totals.n / DEAL_PAGE_SIZE)),
  };
}

export async function getDealCities() {
  const rows = await db.selectDistinct({ city: deals.city }).from(deals).orderBy(deals.city);
  return rows.map((r) => r.city);
}

export async function getDealBanks() {
  const rows = await db.selectDistinct({ bank: deals.bankName }).from(deals).orderBy(deals.bankName);
  return rows.map((r) => r.bank).filter((b): b is string => !!b);
}

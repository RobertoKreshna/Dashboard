import Link from "next/link";
import { and, count, desc, eq, gte, inArray, lt, min, sql, sum } from "drizzle-orm";
import { Building2, CalendarCheck, Handshake, MapPin, Trophy } from "lucide-react";
import { db } from "@/db";
import { deals, listings, salesCodes } from "@/db/schema";
import { PageHeader } from "@/components/common/page-header";
import { DealsTrendChart } from "@/components/dashboard/deals-trend-chart";
import { getDealTrend, type TrendBy } from "@/lib/deal-trend";
import { TopSalesPeriod, type Period } from "@/components/dashboard/top-sales-period";
import { ListingMap } from "@/components/listings/listing-map-loader";
import { getMapCounts, getMapPoints, parseListingFilters } from "@/lib/listing-queries";
import { formatIDR } from "@/lib/format";

export const metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

function Stat({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <span className="rounded-lg bg-brand-light/60 p-1.5 text-brand-ink"><Icon className="size-4" /></span>
        {label}
      </div>
      <div className="whitespace-nowrap text-2xl font-bold tracking-tight xl:text-3xl">{value}</div>
      {hint && <p className="mt-2 text-sm text-muted-foreground">{hint}</p>}
    </div>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  // The staff overview map covers every active listing (available + reserved) unless a status is chosen.
  const mapFilters = parseListingFilters({ ...sp, status: sp.status ?? "active" });
  const [mapCounts, mapPoints] = await Promise.all([getMapCounts(mapFilters), getMapPoints(mapFilters)]);
  // ---- Top sales codes period ----
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  const nowD = new Date();
  const period = (["month", "year", "all"].includes(one(sp.period)) ? one(sp.period) : "month") as Period;
  const pYear = Math.min(2100, Math.max(2000, Number(one(sp.y)) || nowD.getFullYear()));
  const pMonth = Math.min(12, Math.max(1, Number(one(sp.m)) || nowD.getMonth() + 1));
  const ymd = (y: number, m: number, d = 1) => `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  let range: { gte?: string; lt?: string } = {};
  let periodLabel = "All time";
  if (period === "month") {
    range = { gte: ymd(pYear, pMonth), lt: pMonth === 12 ? ymd(pYear + 1, 1) : ymd(pYear, pMonth + 1) };
    periodLabel = new Date(pYear, pMonth - 1, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  } else if (period === "year") {
    range = { gte: ymd(pYear, 1), lt: ymd(pYear + 1, 1) };
    periodLabel = String(pYear);
  }
  const [{ firstDeal }] = await db.select({ firstDeal: min(deals.dealDate) }).from(deals);
  const firstYear = firstDeal ? Number(firstDeal.slice(0, 4)) : nowD.getFullYear();
  const years: number[] = [];
  for (let y = nowD.getFullYear(); y >= Math.min(firstYear, nowD.getFullYear()); y--) years.push(y);
  if (!years.includes(pYear)) {
    years.push(pYear);
    years.sort((a, b) => b - a);
  }

  const by = (["total", "payment", "sales"].includes(one(sp.by)) ? one(sp.by) : "total") as TrendBy;
  const trend = await getDealTrend({ period, year: pYear, month: pMonth, by });

  const where = mapFilters.village || mapFilters.district || mapFilters.city || mapFilters.province;
  const listingsQs = new URLSearchParams({ status: "all" });
  for (const k of ["province", "city", "district", "village"] as const) if (mapFilters[k]) listingsQs.set(k, mapFilters[k]);

  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const iso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;

  const [byType, [month], top] = await Promise.all([
    db
      .select({ type: listings.listingType, n: count() })
      .from(listings)
      .where(inArray(listings.status, ["available", "reserved"]))
      .groupBy(listings.listingType),
    db
      .select({ n: count(), value: sql<number>`coalesce(${sum(deals.finalPrice)}, 0)::float8` })
      .from(deals)
      .where(and(gte(deals.dealDate, iso(first)), lt(deals.dealDate, iso(next)))),
    db
      .select({
        code: deals.salesCode,
        name: salesCodes.fullName,
        n: count(),
        value: sql<number>`coalesce(${sum(deals.finalPrice)}, 0)::float8`,
      })
      .from(deals)
      .innerJoin(salesCodes, eq(salesCodes.code, deals.salesCode))
      .where(and(range.gte ? gte(deals.dealDate, range.gte) : undefined, range.lt ? lt(deals.dealDate, range.lt) : undefined))
      .groupBy(deals.salesCode, salesCodes.fullName)
      .orderBy(desc(count()), desc(sql`sum(${deals.finalPrice})`))
      .limit(5),
  ]);

  const sell = byType.find((r) => r.type === "sell")?.n ?? 0;
  const rent = byType.find((r) => r.type === "rent")?.n ?? 0;
  const monthName = now.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
  const maxN = Math.max(1, ...top.map((t) => t.n));

  return (
    <>
      <PageHeader title="Dashboard" description={`Overview for ${monthName}`} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Stat icon={Building2} label="Active listings" value={String(sell + rent)} hint={`${sell} for sale · ${rent} for rent (available + reserved)`} />
        <Stat icon={Handshake} label="Deals this month" value={String(month.n)} hint={monthName} />
        <Stat icon={CalendarCheck} label="Deal value this month" value={formatIDR(month.value)} hint="Sum of final agreed prices" />
      </div>

      <div className="mt-6 rounded-xl border bg-card p-4 shadow-sm sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 font-semibold"><MapPin className="size-4 text-brand-ink" /> Listings map</h2>
          <span className="text-xs text-muted-foreground">Active listings (available + reserved)</span>
        </div>
        <div className="lg:h-[560px]">
          <ListingMap counts={mapCounts} points={mapPoints} listingBase="/listings" />
        </div>
        {where && (
          <p className="mt-3 text-sm">
            <Link href={`/listings?${listingsQs}`} className="font-medium text-brand-ink hover:underline">
              Open listings in {where} →
            </Link>
          </p>
        )}
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Deals</h2>
          <p className="text-sm text-muted-foreground">{periodLabel}</p>
        </div>
        <TopSalesPeriod period={period} month={pMonth} year={pYear} years={years} />
      </div>

      <div className="mt-4">
        <DealsTrendChart trend={trend} by={by} periodLabel={periodLabel} />
      </div>

      <div className="mt-6 rounded-xl border bg-card p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 font-semibold"><Trophy className="size-4 text-brand-ink" /> Top sales codes</h2>
            <p className="mt-1 text-xs text-muted-foreground">By number of deals · {periodLabel}</p>
          </div>
        </div>
        {top.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No deals in this period. <Link href="/deals/new" className="text-brand-ink hover:underline">Record a deal</Link>.
          </p>
        ) : (
          <ol className="space-y-3">
            {top.map((t, i) => (
              <li key={t.code}>
                <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2 text-sm">
                  <span className="font-medium">{i + 1}. {t.code} <span className="font-normal text-muted-foreground">· {t.name}</span></span>
                  <span className="tabular-nums">{t.n} deal{t.n > 1 ? "s" : ""} · {formatIDR(t.value)}</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-brand-light/50" role="presentation">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${(t.n / maxN) * 100}%` }} />
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </>
  );
}

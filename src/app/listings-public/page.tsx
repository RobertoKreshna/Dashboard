import { SavedSearches } from "@/components/listings/saved-searches";
import { Pagination } from "@/components/common/pagination";
import { ListingFilterBar } from "@/components/listings/listing-filter-bar";
import { ListPanel } from "@/components/listings/list-panel";
import { MapHoverProvider } from "@/components/listings/map-hover";
import { ListingMap } from "@/components/listings/listing-map-loader";
import { PublicListingRow } from "@/components/listings/public-listing-row";
import {
  getLocationOptions,
  getMapCounts,
  getMapPoints,
  getPriceBounds,
  getPublicSummary,
  getSalesCodeOptions,
  parseListingFilters,
  queryListings,
} from "@/lib/listing-queries";

export const metadata = {
  title: "Property Listings",
  description: "Browse V-PRO houses, apartments, land and commercial properties for sale and rent.",
};
export const dynamic = "force-dynamic";

function Summary({ s }: { s: Awaited<ReturnType<typeof getPublicSummary>> }) {
  const sellRent = (c: { sell: number; rent: number }) => `${c.sell} for sale · ${c.rent} for rent`;
  const parts = [
    { label: "Available", value: s.byStatus.available, color: "#4aa8de", detail: sellRent(s.cross.available) },
    { label: "Reserved", value: s.byStatus.reserved, color: "#e8c12e", detail: sellRent(s.cross.reserved) },
  ];
  // Closed deals aren't shown to the public, so the total only counts what can still be viewed.
  const total = s.byStatus.available + s.byStatus.reserved;
  return (
    <div className="grid gap-5 rounded-xl border bg-card px-5 py-4 shadow-sm sm:grid-cols-[auto_1fr] sm:items-center sm:gap-10">
      <div>
        <div className="text-3xl font-bold tabular-nums leading-none">{total}</div>
        <div className="mt-1.5 text-sm font-medium">Total listings</div>
      </div>
      <div>
        <div
          role="img"
          aria-label={parts.map((p) => `${p.value} ${p.label} (${p.detail})`).join(", ")}
          className="flex h-3 overflow-hidden rounded-full bg-muted"
        >
          {parts.map((p) =>
            p.value > 0 ? (
              <div key={p.label} style={{ width: `${(p.value / Math.max(1, total)) * 100}%`, background: p.color }} />
            ) : null,
          )}
        </div>
        <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
          {parts.map((p) => (
            <li
              key={p.label}
              tabIndex={0}
              aria-label={`${p.value} ${p.label}: ${p.detail}`}
              className="group relative flex cursor-default items-center gap-2 rounded outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="size-2.5 rounded-full" style={{ background: p.color }} />
              <span className="font-semibold tabular-nums">{p.value}</span>
              <span className="text-muted-foreground underline decoration-dotted underline-offset-4">{p.label}</span>
              <span
                role="tooltip"
                className="pointer-events-none absolute bottom-full left-0 z-10 mb-2 hidden whitespace-nowrap rounded-md bg-foreground px-2.5 py-1.5 text-xs text-white shadow-lg group-hover:block group-focus:block"
              >
                {p.detail}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default async function PublicDashboard({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const filters = parseListingFilters(sp);
  // Closed deals aren't public, even if someone edits ?status= in the URL.
  if (filters.status !== "available" && filters.status !== "reserved") filters.status = "available";
  const [summary, counts, points, list, locations, codes, priceBounds] = await Promise.all([
    getPublicSummary(),
    getMapCounts(filters),
    getMapPoints(filters),
    queryListings("public", filters),
    getLocationOptions("public"),
    getSalesCodeOptions("public"),
    getPriceBounds(),
  ]);

  return (
    <div className="space-y-4">
      <section aria-labelledby="summary">
        <h1 id="summary" className="mb-3 text-2xl font-bold tracking-tight">Property Listings</h1>
        <Summary s={summary} />
      </section>

      <ListingFilterBar compact openOnly priceBounds={priceBounds} locations={locations} salesCodes={codes} />
      <SavedSearches basePath="/listings-public" />

      <MapHoverProvider>
      <section aria-label="Map and listings" className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="min-w-0 rounded-xl border bg-card p-3 shadow-sm sm:p-4 lg:sticky lg:top-20 lg:h-[calc(100dvh-6.5rem)]">
          <ListingMap counts={counts} points={points} />
        </div>

        <ListPanel className="space-y-3 lg:h-[calc(100dvh-6.5rem)] lg:overflow-y-auto lg:p-1.5">
          <h2 className="text-sm font-semibold text-muted-foreground">
            {list.total.toLocaleString("id-ID")} listing{list.total === 1 ? "" : "s"}
            {(() => {
              const where = filters.village || filters.district || filters.city || filters.province;
              return where ? ` in ${where}` : "";
            })()}
          </h2>
          {list.rows.length === 0 ? (
            <div className="rounded-xl border bg-card py-16 text-center text-muted-foreground">No listings match these filters.</div>
          ) : (
            list.rows.map((l) => <PublicListingRow key={l.id} l={l} />)
          )}
          <Pagination basePath="/listings-public" searchParams={sp} page={filters.page} pages={list.pages} total={list.total} />
        </ListPanel>
      </section>
      </MapHoverProvider>
    </div>
  );
}

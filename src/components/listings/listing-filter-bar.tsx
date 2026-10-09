"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/common/native-select";
import { MoneyInput } from "@/components/common/money-input";
import { cn } from "@/lib/utils";
import { MoreFilters } from "@/components/listings/more-filters";
import type { PriceBounds } from "@/lib/listing-queries";
import { LISTING_STATUSES, PROPERTY_TYPES } from "@/lib/constants";

type Loc = { province: string; city: string; district: string; village: string };
type Agent = { code: string; name: string | null };

export function ListingFilterBar({
  locations,
  salesCodes,
  compact = false,
  openOnly = false,
  priceBounds,
}: {
  locations: Loc[];
  salesCodes: Agent[];
  /** Search + main filters on one row; the rest behind a toggle. */
  compact?: boolean;
  /** Public view: only Available / Reserved can be picked (no Sold, Rented or All statuses). */
  openOnly?: boolean;
  priceBounds?: PriceBounds;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const get = (k: string) => params.get(k) ?? "";

  const push = React.useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v === null || v === "") next.delete(k);
        else next.set(k, v);
      }
      next.delete("page");
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [params, pathname, router],
  );

  // Debounced text inputs
  const [q, setQ] = React.useState(get("q"));
  const [minP, setMinP] = React.useState(get("minPrice"));
  const [maxP, setMaxP] = React.useState(get("maxPrice"));
  const first = React.useRef(true);
  React.useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => {
      if (q !== get("q") || minP !== get("minPrice") || maxP !== get("maxPrice")) {
        push({ q, minPrice: minP, maxPrice: maxP });
      }
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, minP, maxP]);

  const province = get("province");
  const city = get("city");
  const cities = [...new Set(locations.filter((l) => !province || l.province === province).map((l) => l.city))].sort((a, b) => a.localeCompare(b));
  const districts = [
    ...new Set(locations.filter((l) => (!city || l.city === city) && (!province || l.province === province)).map((l) => l.district)),
  ].sort((a, b) => a.localeCompare(b));
  const status = params.get("status") ?? "available";
  const hasFilters = [...params.keys()].some((k) => k !== "page");

  const ADVANCED = ["city", "district", "minPrice", "maxPrice", "beds", "baths", "salesCode", "sort"];
  const advancedActive = ADVANCED.filter((k) => params.get(k)).length;
  const [more, setMore] = React.useState(false);
  const showAdvanced = !compact || more;

  const searchBox = (
    <div className="relative sm:col-span-2">
      <Search className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" />
      <Input aria-label="Search listings" placeholder="Search title, address or ID…" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
    </div>
  );
  const typeSel = (
    <NativeSelect aria-label="Sell or rent" value={get("type")} onChange={(e) => push({ type: e.target.value })}>
      <option value="">Sell &amp; Rent</option>
      <option value="sell">Sell</option>
      <option value="rent">Rent</option>
    </NativeSelect>
  );
  const propSel = (
    <NativeSelect aria-label="Property type" value={get("propertyType")} onChange={(e) => push({ propertyType: e.target.value })}>
      <option value="">All property types</option>
      {PROPERTY_TYPES.map((p) => (
        <option key={p.value} value={p.value}>{p.label}</option>
      ))}
    </NativeSelect>
  );
  const statusSel = (
    <NativeSelect aria-label="Status" value={status} onChange={(e) => push({ status: e.target.value === "available" ? null : e.target.value })}>
      {LISTING_STATUSES.filter((s) => !openOnly || s.value === "available" || s.value === "reserved").map((s) => (
        <option key={s.value} value={s.value}>{s.label}</option>
      ))}
      {!openOnly && <option value="all">All statuses</option>}
    </NativeSelect>
  );
  const clearBtn = hasFilters && (
    <Button
      variant="ghost"
      onClick={() => {
        setQ("");
        setMinP("");
        setMaxP("");
        router.replace(pathname, { scroll: false });
      }}
    >
      <X /> Clear filters
    </Button>
  );
  const advanced = (
    <>
      <NativeSelect
        aria-label="City / regency"
        value={city}
        onChange={(e) =>
          push({
            city: e.target.value,
            // Keep the map and the filter in sync: a city implies its province.
            province: e.target.value ? (locations.find((l) => l.city === e.target.value)?.province ?? null) : province || null,
            district: null,
            village: null,
          })
        }
      >
        <option value="">All cities / regencies</option>
        {cities.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </NativeSelect>
      <NativeSelect aria-label="District" value={get("district")} onChange={(e) => push({ district: e.target.value, village: null })}>
        <option value="">All districts</option>
        {districts.map((d) => (
          <option key={d} value={d}>{d}</option>
        ))}
      </NativeSelect>
      <MoneyInput aria-label="Minimum price" placeholder="Min price (Rp)" value={minP} onValueChange={setMinP} />
      <MoneyInput aria-label="Maximum price" placeholder="Max price (Rp)" value={maxP} onValueChange={setMaxP} />
      <NativeSelect aria-label="Bedrooms" value={get("beds")} onChange={(e) => push({ beds: e.target.value })}>
        <option value="">Any bedrooms</option>
        {[1, 2, 3, 4, 5].map((n) => (
          <option key={n} value={n}>{n}+ bedrooms</option>
        ))}
      </NativeSelect>
      <NativeSelect aria-label="Bathrooms" value={get("baths")} onChange={(e) => push({ baths: e.target.value })}>
        <option value="">Any bathrooms</option>
        {[1, 2, 3, 4].map((n) => (
          <option key={n} value={n}>{n}+ bathrooms</option>
        ))}
      </NativeSelect>
      <NativeSelect aria-label="Sales code" value={get("salesCode")} onChange={(e) => push({ salesCode: e.target.value })}>
        <option value="">All sales codes</option>
        {salesCodes.map((s) => (
          <option key={s.code} value={s.code}>{s.code}{s.name ? ` · ${s.name}` : ""}</option>
        ))}
      </NativeSelect>
      <NativeSelect aria-label="Sort" value={get("sort") || "newest"} onChange={(e) => push({ sort: e.target.value === "newest" ? null : e.target.value })}>
        <option value="newest">Newest first</option>
        <option value="oldest">Oldest first</option>
        <option value="price_asc">Price: low to high</option>
        <option value="price_desc">Price: high to low</option>
      </NativeSelect>
    </>
  );

  if (compact && priceBounds) {
    return (
      <div className="rounded-xl border bg-card p-3 shadow-sm sm:p-4">
        <div className="grid grid-cols-2 gap-3 lg:flex lg:flex-wrap lg:items-center">
          <div className="col-span-2 lg:min-w-64 lg:flex-1">{searchBox}</div>
          <div className="lg:w-40">{typeSel}</div>
          <div className="lg:w-52">{propSel}</div>
          <div className="lg:w-40">{statusSel}</div>
          <MoreFilters locations={locations} salesCodes={salesCodes} priceBounds={priceBounds} />
          {clearBtn}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card p-3 shadow-sm sm:p-4">
      <div className={cn("grid gap-3 lg:grid-cols-4", compact ? "grid-cols-2" : "sm:grid-cols-2")}>
        {searchBox}
        {typeSel}
        {propSel}
        {!compact && advanced}
        {!compact && statusSel}
        {!compact && clearBtn}
        {compact && (
          <>
            {statusSel}
            <Button type="button" variant="outline" aria-expanded={more} onClick={() => setMore((m) => !m)}>
              <SlidersHorizontal /> More filters{advancedActive ? ` (${advancedActive})` : ""}
            </Button>
            {clearBtn}
          </>
        )}
      </div>
      {compact && showAdvanced && <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">{advanced}</div>}
    </div>
  );
}

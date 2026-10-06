"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/common/native-select";
import { PriceRange } from "@/components/listings/price-range";
import type { PriceBounds } from "@/lib/listing-queries";
import { cn } from "@/lib/utils";

type Loc = { province: string; city: string; district: string; village: string };
type Agent = { code: string; name: string | null };

const KEYS = ["city", "district", "minPrice", "maxPrice", "beds", "baths", "salesCode", "sort"] as const;
type Draft = Record<(typeof KEYS)[number], string>;

function Chips({
  label,
  value,
  onChange,
  max,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  max: number;
}) {
  const opts = ["", ...Array.from({ length: max }, (_, i) => String(i + 1))];
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {opts.map((o) => (
        <button
          key={o || "any"}
          type="button"
          role="radio"
          aria-checked={value === o}
          onClick={() => onChange(o)}
          className={cn(
            "h-9 min-w-12 rounded-full border px-3.5 text-sm font-medium transition",
            value === o ? "border-primary bg-primary text-primary-foreground" : "bg-white hover:bg-brand-light/50",
          )}
        >
          {o ? `${o}+` : "Any"}
        </button>
      ))}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2.5">
      <h3 className="text-sm font-semibold">{title}</h3>
      {children}
    </section>
  );
}

export function MoreFilters({
  locations,
  salesCodes,
  priceBounds,
}: {
  locations: Loc[];
  salesCodes: Agent[];
  priceBounds: PriceBounds;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [open, setOpen] = React.useState(false);

  const fromUrl = React.useCallback((): Draft => {
    const d = {} as Draft;
    for (const k of KEYS) d[k] = params.get(k) ?? "";
    return d;
  }, [params]);
  const [draft, setDraft] = React.useState<Draft>(fromUrl);
  const set = (k: keyof Draft, v: string) => setDraft((d) => ({ ...d, [k]: v }));

  const active = KEYS.filter((k) => params.get(k) && !(k === "sort" && params.get(k) === "newest")).length;

  const openPanel = () => {
    setDraft(fromUrl());
    setOpen(true);
  };

  React.useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [open]);

  const province = params.get("province") ?? "";
  const cities = [...new Set(locations.filter((l) => !province || l.province === province).map((l) => l.city))].sort((a, b) => a.localeCompare(b));
  const districts = [
    ...new Set(locations.filter((l) => (!draft.city || l.city === draft.city) && (!province || l.province === province)).map((l) => l.district)),
  ].sort((a, b) => a.localeCompare(b));

  const type = params.get("type");
  const bounds = (type === "sell" ? priceBounds.sell : type === "rent" ? priceBounds.rent : null) ?? priceBounds.all;

  const apply = () => {
    const next = new URLSearchParams(params.toString());
    for (const k of KEYS) {
      const v = draft[k];
      if (v && !(k === "sort" && v === "newest")) next.set(k, v);
      else next.delete(k);
    }
    // A city implies its province, which keeps the map and the filters in sync.
    if (draft.city) {
      const p = locations.find((l) => l.city === draft.city)?.province;
      if (p) next.set("province", p);
    }
    if (draft.city !== (params.get("city") ?? "")) next.delete("village");
    next.delete("page");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    setOpen(false);
  };

  const reset = () => setDraft((d) => ({ ...d, ...Object.fromEntries(KEYS.map((k) => [k, ""])) }) as Draft);

  return (
    <div className="relative">
      <Button type="button" variant="outline" className="w-full lg:w-auto" aria-haspopup="dialog" aria-expanded={open} onClick={() => (open ? setOpen(false) : openPanel())}>
        <SlidersHorizontal /> More filters
        {active > 0 && (
          <span className="ml-0.5 rounded-full bg-primary px-1.5 text-xs font-bold text-primary-foreground">{active}</span>
        )}
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4"
          onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="More filters"
            className="flex max-h-[90dvh] w-full flex-col overflow-hidden rounded-t-2xl border bg-card shadow-2xl sm:w-[560px] sm:rounded-2xl"
          >
            <div className="flex items-center justify-between border-b px-5 py-3.5">
              <h2 className="font-semibold">Filters</h2>
              <button type="button" aria-label="Close filters" onClick={() => setOpen(false)} className="rounded-lg p-1.5 hover:bg-muted">
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-6 overflow-y-auto px-5 py-5">
              <Section title="Price">
                <PriceRange
                  key={`${type}`}
                  bounds={bounds}
                  min={draft.minPrice}
                  max={draft.maxPrice}
                  onChange={(a, b) => setDraft((d) => ({ ...d, minPrice: a, maxPrice: b }))}
                />
              </Section>

              <Section title="Rooms">
                <div className="space-y-3">
                  <div>
                    <div className="mb-1.5 text-xs text-muted-foreground">Bedrooms</div>
                    <Chips label="Bedrooms" value={draft.beds} onChange={(v) => set("beds", v)} max={5} />
                  </div>
                  <div>
                    <div className="mb-1.5 text-xs text-muted-foreground">Bathrooms</div>
                    <Chips label="Bathrooms" value={draft.baths} onChange={(v) => set("baths", v)} max={4} />
                  </div>
                </div>
              </Section>

              <Section title="Location">
                <div className="grid gap-3 sm:grid-cols-2">
                  <NativeSelect
                    aria-label="City / regency"
                    value={draft.city}
                    onChange={(e) => setDraft((d) => ({ ...d, city: e.target.value, district: "" }))}
                  >
                    <option value="">All cities / regencies</option>
                    {cities.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </NativeSelect>
                  <NativeSelect aria-label="District" value={draft.district} onChange={(e) => set("district", e.target.value)}>
                    <option value="">All districts</option>
                    {districts.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </NativeSelect>
                </div>
              </Section>

              <Section title="Agent & sorting">
                <div className="grid gap-3 sm:grid-cols-2">
                  <NativeSelect aria-label="Sales code" value={draft.salesCode} onChange={(e) => set("salesCode", e.target.value)}>
                    <option value="">All sales codes</option>
                    {salesCodes.map((s) => (
                      <option key={s.code} value={s.code}>{s.code}{s.name ? ` · ${s.name}` : ""}</option>
                    ))}
                  </NativeSelect>
                  <NativeSelect aria-label="Sort" value={draft.sort || "newest"} onChange={(e) => set("sort", e.target.value)}>
                    <option value="newest">Newest first</option>
                    <option value="oldest">Oldest first</option>
                    <option value="price_asc">Price: low to high</option>
                    <option value="price_desc">Price: high to low</option>
                  </NativeSelect>
                </div>
              </Section>
            </div>

            <div className="flex items-center justify-between gap-3 border-t bg-card px-5 py-3.5">
              <Button type="button" variant="ghost" onClick={reset}>Reset</Button>
              <Button type="button" size="lg" onClick={apply}>Show results</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

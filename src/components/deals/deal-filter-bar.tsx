"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Download, Search, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/common/native-select";
import { DateRangeField } from "@/components/common/range-calendar";
import { FilterModal } from "@/components/common/filter-modal";
import { DEAL_SOURCES, DEAL_TYPES } from "@/lib/constants";
import { cn } from "@/lib/utils";

const KEYS = ["from", "to", "salesCode", "city", "payment", "bank"] as const;
type Draft = Record<(typeof KEYS)[number], string>;

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function presets() {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();
  return [
    { label: "This month", from: iso(new Date(y, m, 1)), to: iso(new Date(y, m + 1, 0)) },
    { label: "Last month", from: iso(new Date(y, m - 1, 1)), to: iso(new Date(y, m, 0)) },
    { label: "This year", from: `${y}-01-01`, to: `${y}-12-31` },
  ];
}

export function DealFilterBar({
  salesCodes,
  cities,
  banks,
}: {
  salesCodes: { code: string; name: string }[];
  cities: string[];
  banks: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const get = (k: string) => params.get(k) ?? "";
  const [, startNav] = React.useTransition();

  const push = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    next.delete("page");
    const qs = next.toString();
    startNav(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  };

  // Debounced search box
  const [q, setQ] = React.useState(get("q"));
  React.useEffect(() => {
    if (q === get("q")) return;
    const t = setTimeout(() => push({ q }), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  // "More filters" modal (staged; applied with "Show results")
  const [open, setOpen] = React.useState(false);
  const fromUrl = (): Draft => ({ from: get("from"), to: get("to"), salesCode: get("salesCode"), city: get("city"), payment: get("payment"), bank: get("bank") });
  const [draft, setDraft] = React.useState<Draft>(fromUrl);
  const set = (k: keyof Draft, v: string) => setDraft((d) => ({ ...d, [k]: v }));
  const active = KEYS.filter((k) => params.get(k)).length;
  const hasFilters = [...params.keys()].some((k) => k !== "page");
  const ps = presets();

  const exportQs = new URLSearchParams(params.toString());
  exportQs.delete("page");

  const linkBtn =
    "inline-flex h-10 items-center gap-1.5 rounded-lg border bg-white px-4 text-sm font-medium hover:bg-muted";

  return (
    <div className="rounded-xl border bg-card p-3 shadow-sm sm:p-4">
      <div className="grid grid-cols-2 gap-3 lg:flex lg:flex-wrap lg:items-center">
        <div className="relative col-span-2 lg:min-w-64 lg:flex-1">
          <Search className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" />
          <Input aria-label="Search deals" placeholder="Buyer / tenant name, listing ID or deal ID…" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="lg:w-40">
          <NativeSelect aria-label="Deal type" value={get("type")} onChange={(e) => push({ type: e.target.value })}>
            <option value="">Sale &amp; Rent</option>
            {DEAL_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </NativeSelect>
        </div>
        <div className="lg:w-44">
          <NativeSelect aria-label="Source" value={get("source")} onChange={(e) => push({ source: e.target.value })}>
            <option value="">All sources</option>
            {DEAL_SOURCES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </NativeSelect>
        </div>
        <Button
          type="button"
          variant="outline"
          aria-haspopup="dialog"
          aria-expanded={open}
          className="w-full lg:w-auto"
          onClick={() => {
            setDraft(fromUrl());
            setOpen(true);
          }}
        >
          <SlidersHorizontal /> More filters
          {active > 0 && <span className="ml-0.5 rounded-full bg-primary px-1.5 text-xs font-bold text-primary-foreground">{active}</span>}
        </Button>
        {hasFilters && (
          <Button variant="ghost" onClick={() => { setQ(""); router.replace(pathname, { scroll: false }); }}>
            <X /> Clear filters
          </Button>
        )}
        <div className="col-span-2 flex gap-2 lg:ml-auto">
          <a href={`/deals/export?${exportQs}&format=xlsx`} className={linkBtn}><Download className="size-4" /> Excel</a>
          <a href={`/deals/export?${exportQs}&format=csv`} className={linkBtn}><Download className="size-4" /> CSV</a>
        </div>
      </div>

      {open && (
        <FilterModal
          onClose={() => setOpen(false)}
          onReset={() => setDraft({ from: "", to: "", salesCode: "", city: "", payment: "", bank: "" })}
          onApply={() => {
            push({
              from: draft.from,
              to: draft.to || (draft.from ? draft.from : ""),
              salesCode: draft.salesCode,
              city: draft.city,
              payment: draft.payment,
              bank: draft.payment === "bank" ? draft.bank : "",
            });
            setOpen(false);
          }}
        >
          <section className="space-y-2.5">
            <h3 className="text-sm font-semibold">Deal date</h3>
            <div className="flex gap-2" role="group" aria-label="Date presets">
              {ps.map((p) => {
                const on = draft.from === p.from && draft.to === p.to;
                return (
                  <button
                    key={p.label}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setDraft((d) => ({ ...d, from: p.from, to: p.to }))}
                    className={cn(
                      "h-8 rounded-full border px-3.5 text-sm font-medium transition",
                      on ? "border-primary bg-primary text-primary-foreground" : "bg-white hover:bg-brand-light/50",
                    )}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
            <DateRangeField
              from={draft.from}
              to={draft.to}
              onChange={(f, t) => setDraft((d) => ({ ...d, from: f, to: t }))}
            />
          </section>

          <section className="space-y-2.5">
            <h3 className="text-sm font-semibold">Payment</h3>
            <div role="radiogroup" aria-label="Payment type" className="flex flex-wrap gap-2">
              {[["", "Any"], ["cash", "Cash"], ["bank", "Bank"]].map(([v, label]) => (
                <button
                  key={v || "any"}
                  type="button"
                  role="radio"
                  aria-checked={draft.payment === v}
                  onClick={() => setDraft((d) => ({ ...d, payment: v, bank: v === "bank" ? d.bank : "" }))}
                  className={cn(
                    "h-8 min-w-14 rounded-full border px-3.5 text-sm font-medium transition",
                    draft.payment === v ? "border-primary bg-primary text-primary-foreground" : "bg-white hover:bg-brand-light/50",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            {draft.payment === "bank" && (
              <NativeSelect aria-label="Bank" value={draft.bank} onChange={(e) => set("bank", e.target.value)}>
                <option value="">All banks</option>
                {banks.map((b) => <option key={b} value={b}>{b}</option>)}
              </NativeSelect>
            )}
          </section>

          <section className="space-y-2.5">
            <h3 className="text-sm font-semibold">Agent & location</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <NativeSelect aria-label="Sales code" value={draft.salesCode} onChange={(e) => set("salesCode", e.target.value)}>
                <option value="">All sales codes</option>
                {salesCodes.map((s) => <option key={s.code} value={s.code}>{s.code} · {s.name}</option>)}
              </NativeSelect>
              <NativeSelect aria-label="City" value={draft.city} onChange={(e) => set("city", e.target.value)}>
                <option value="">All cities / regencies</option>
                {cities.map((c) => <option key={c} value={c}>{c}</option>)}
              </NativeSelect>
            </div>
          </section>
        </FilterModal>
      )}
    </div>
  );
}

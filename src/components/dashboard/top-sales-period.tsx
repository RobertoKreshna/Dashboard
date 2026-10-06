"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { NativeSelect } from "@/components/common/native-select";
import { cn } from "@/lib/utils";

import type { Period } from "@/lib/period";
export type { Period };

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** Period picker for the "Top sales codes" card. State lives in the URL (period, m, y). */
export function TopSalesPeriod({
  period,
  month,
  year,
  years,
}: {
  period: Period;
  month: number; // 1-12
  year: number;
  years: number[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = React.useTransition();

  const set = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    const qs = next.toString();
    start(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  };

  const shiftMonth = (d: number) => {
    const i = year * 12 + (month - 1) + d;
    set({ period: "month", m: String((i % 12) + 1), y: String(Math.floor(i / 12)) });
  };
  const shiftYear = (d: number) => set({ period: "year", y: String(year + d) });

  const arrow = "shrink-0 rounded-lg border bg-white p-2 hover:bg-muted disabled:opacity-40";

  return (
    <div className={cn("flex flex-wrap items-center gap-2", pending && "opacity-70")}>
      <div role="group" aria-label="Period" className="inline-flex rounded-lg border bg-muted p-1">
        {(
          [
            ["month", "Month"],
            ["year", "Year"],
            ["all", "All time"],
          ] as const
        ).map(([v, label]) => (
          <button
            key={v}
            type="button"
            aria-pressed={period === v}
            onClick={() => set({ period: v })}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-semibold transition",
              period === v ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {period === "month" && (
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <button type="button" aria-label="Previous month" className={arrow} onClick={() => shiftMonth(-1)}>
            <ChevronLeft className="size-4" />
          </button>
          <div className="min-w-0 flex-1 sm:w-36 sm:flex-none">
            <NativeSelect aria-label="Month" value={String(month)} onChange={(e) => set({ period: "month", m: e.target.value })}>
              {MONTHS.map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
              ))}
            </NativeSelect>
          </div>
          <div className="w-24 shrink-0">
            <NativeSelect aria-label="Year" value={String(year)} onChange={(e) => set({ period: "month", y: e.target.value })}>
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </NativeSelect>
          </div>
          <button type="button" aria-label="Next month" className={arrow} onClick={() => shiftMonth(1)}>
            <ChevronRight className="size-4" />
          </button>
        </div>
      )}

      {period === "year" && (
        <div className="flex items-center gap-2">
          <button type="button" aria-label="Previous year" className={arrow} onClick={() => shiftYear(-1)}>
            <ChevronLeft className="size-4" />
          </button>
          <div className="w-28">
            <NativeSelect aria-label="Year" value={String(year)} onChange={(e) => set({ period: "year", y: e.target.value })}>
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </NativeSelect>
          </div>
          <button type="button" aria-label="Next year" className={arrow} onClick={() => shiftYear(1)}>
            <ChevronRight className="size-4" />
          </button>
        </div>
      )}
    </div>
  );
}

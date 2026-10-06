"use client";

import * as React from "react";
import { MoneyInput } from "@/components/common/money-input";

const STEPS = 1000;
const id = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 });

/** 1.500.000.000 -> "Rp 1,5 M", 12.000.000 -> "Rp 12 jt" */
export function compactIDR(n: number): string {
  if (n >= 1e12) return `Rp ${id.format(n / 1e12)} T`;
  if (n >= 1e9) return `Rp ${id.format(n / 1e9)} M`;
  if (n >= 1e6) return `Rp ${id.format(n / 1e6)} jt`;
  return `Rp ${new Intl.NumberFormat("id-ID").format(Math.round(n))}`;
}

const nice = (x: number) => {
  const mag = 10 ** (Math.floor(Math.log10(x)) - 1);
  return Math.round(x / mag) * mag;
};

/**
 * Log-scale dual slider (prices span Rp 6 jt … Rp 9 M, a linear slider would be unusable).
 * value: digits string, "" = no limit.
 */
export function PriceRange({
  bounds,
  min,
  max,
  onChange,
}: {
  bounds: [number, number];
  min: string;
  max: string;
  onChange: (min: string, max: string) => void;
}) {
  const [lo, hi] = bounds;
  const ratio = Math.log(hi / lo);
  const toT = (p: number) => Math.max(0, Math.min(STEPS, Math.round((STEPS * Math.log(Math.max(p, lo) / lo)) / ratio)));
  const fromT = (t: number) => (t <= 0 ? lo : t >= STEPS ? hi : Math.min(hi, Math.max(lo, nice(lo * Math.exp((ratio * t) / STEPS)))));

  const tMin = min ? toT(Number(min)) : 0;
  const tMax = max ? toT(Number(max)) : STEPS;

  const setMin = (t: number) => {
    const v = Math.min(t, tMax - 10);
    onChange(v <= 0 ? "" : String(fromT(v)), max);
  };
  const setMax = (t: number) => {
    const v = Math.max(t, tMin + 10);
    onChange(min, v >= STEPS ? "" : String(fromT(v)));
  };

  const label = `${min ? compactIDR(Number(min)) : "No minimum"}  –  ${max ? compactIDR(Number(max)) : "No maximum"}`;

  return (
    <div className="space-y-3">
      <div className="relative h-6">
        <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-muted" />
        <div
          className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-primary"
          style={{ left: `${(tMin / STEPS) * 100}%`, right: `${100 - (tMax / STEPS) * 100}%` }}
        />
        <input
          type="range"
          className="dual-range"
          min={0}
          max={STEPS}
          step={5}
          value={tMin}
          aria-label="Minimum price"
          aria-valuetext={min ? compactIDR(Number(min)) : "No minimum"}
          onChange={(e) => setMin(Number(e.target.value))}
        />
        <input
          type="range"
          className="dual-range"
          min={0}
          max={STEPS}
          step={5}
          value={tMax}
          aria-label="Maximum price"
          aria-valuetext={max ? compactIDR(Number(max)) : "No maximum"}
          onChange={(e) => setMax(Number(e.target.value))}
        />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{compactIDR(lo)}</span>
        <span className="font-semibold text-foreground">{label}</span>
        <span>{compactIDR(hi)}</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <MoneyInput aria-label="Minimum price (exact)" placeholder="Min (Rp)" value={min} onValueChange={(d) => onChange(d, max)} />
        <MoneyInput aria-label="Maximum price (exact)" placeholder="Max (Rp)" value={max} onValueChange={(d) => onChange(min, d)} />
      </div>
    </div>
  );
}

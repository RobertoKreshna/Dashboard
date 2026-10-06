"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { compactIDR } from "@/components/listings/price-range";
import { formatIDR } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { DealTrend, TrendBy } from "@/lib/deal-trend";

// One distinct, readable colour per line (not just shades of blue); the brand blue leads.
const COLORS = [
  "#2b78a8", "#e07a1f", "#2a9d6f", "#8e5bd6", "#d64550", "#0ea5b7", "#b8860b", "#6b7280",
  "#e0559c", "#5b8c1f", "#1f2937", "#a35c2b", "#4f46e5", "#c026d3",
];
/** First 14 lines use the curated palette; beyond that, spread hues around the colour wheel. */
const colorFor = (i: number) => (i < COLORS.length ? COLORS[i] : `hsl(${Math.round(((i - COLORS.length) * 137.5) % 360)} 62% 42%)`);
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const OPTIONS: { value: TrendBy; label: string }[] = [
  { value: "total", label: "Total" },
  { value: "payment", label: "By payment type" },
  { value: "sales", label: "By sales" },
];

function label(bucket: string, gran: "day" | "month") {
  if (gran === "day") return String(Number(bucket.slice(8)));
  return `${MONTHS[Number(bucket.slice(5, 7)) - 1]} ${bucket.slice(2, 4)}`;
}
function longLabel(bucket: string, gran: "day" | "month") {
  if (gran === "day") return `${bucket.slice(8)}/${bucket.slice(5, 7)}/${bucket.slice(0, 4)}`;
  return `${MONTHS[Number(bucket.slice(5, 7)) - 1]} ${bucket.slice(0, 4)}`;
}

export function DealsTrendChart({ trend, by, periodLabel }: { trend: DealTrend; by: TrendBy; periodLabel: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = React.useTransition();
  const el = React.useRef<HTMLDivElement>(null);

  const setBy = (v: TrendBy) => {
    const next = new URLSearchParams(params.toString());
    if (v === "total") next.delete("by");
    else next.set("by", v);
    const qs = next.toString();
    start(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  };

  const hasData = trend.series.some((s) => s.total > 0);

  React.useEffect(() => {
    const node = el.current;
    if (!node || !hasData) return;
    let dead = false;
    (async () => {
      const Plotly = (await import("plotly.js-geo-dist-min")).default;
      if (dead) return;
      // x values are the long labels (shown as the hover header); tick text is the short form.
      const x = trend.buckets.map((b) => longLabel(b, trend.granularity));
      const narrow = node.clientWidth < 420;
      const every = trend.granularity === "day" ? (narrow ? 6 : 3) : narrow ? 2 : 1;
      const tickIdx = trend.buckets.map((_, i) => i).filter((i) => i % every === 0 || i === trend.buckets.length - 1);
      const data = trend.series.map((s, i) => ({
        type: "scatter",
        mode: "lines+markers",
        name: s.name,
        x,
        y: s.values,
        line: { color: colorFor(i), width: 2.5, shape: "linear" },
        marker: { size: trend.granularity === "day" ? 5 : 7, color: colorFor(i) },
        // One tooltip for the whole x position lists every line (Rp 0 where it has no deals).
        text: s.values.map((v, k) => (v > 0 ? `${s.name}: ${formatIDR(v)} · ${s.counts[k]} deal${s.counts[k] === 1 ? "" : "s"}` : `${s.name}: Rp 0`)),
        hovertemplate: "%{text}<extra></extra>",
      }));
      const xTitle =
        trend.granularity === "day" ? `Day of month · ${periodLabel}` : periodLabel === "All time" ? "Month" : `Month · ${periodLabel}`;
      const peak = Math.max(1, ...trend.series.flatMap((s) => s.values));
      const ticks = Array.from({ length: 5 }, (_, i) => (peak * i) / 4);
      await Plotly.react(
        node,
        data,
        {
          margin: { l: narrow ? 92 : 108, r: 16, t: 8, b: 74 },
          paper_bgcolor: "rgba(0,0,0,0)",
          plot_bgcolor: "rgba(0,0,0,0)",
          font: { family: "Inter, system-ui, sans-serif", color: "#1f2937", size: 12 },
          hovermode: "x unified",
          showlegend: trend.series.length > 1,
          legend: { orientation: "h", y: -0.3, x: 0, traceorder: "normal" },
          xaxis: {
            type: "category",
            showgrid: false,
            tickangle: 0,
                        fixedrange: true,
            tickmode: "array",
            tickvals: tickIdx.map((i) => x[i]),
            ticktext: tickIdx.map((i) => label(trend.buckets[i], trend.granularity)),
            title: { text: xTitle, standoff: 10, font: { size: 12, color: "#5b6675" } },
          },
          yaxis: {
            rangemode: "tozero",
            gridcolor: "#e8edf3",
            zeroline: false,
            fixedrange: true,
            title: { text: "Total deal value (Rp)", standoff: 12, font: { size: 12, color: "#5b6675" } },
            tickvals: ticks,
            ticktext: ticks.map((t) => (t === 0 ? "Rp 0" : compactIDR(t))),
          },
          hoverlabel: { font: { family: "Inter, system-ui, sans-serif" } },
        },
        { responsive: true, displaylogo: false, displayModeBar: false },
      );
    })();
    return () => {
      dead = true;
    };
  }, [trend, hasData, periodLabel]);

  React.useEffect(() => {
    const node = el.current;
    return () => {
      import("plotly.js-geo-dist-min").then((m) => node && m.default.purge(node));
    };
  }, []);

  return (
    <div className={cn("rounded-xl border bg-card p-4 shadow-sm transition-opacity sm:p-5", pending && "opacity-70")}>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">Deals over time</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Total deal value in rupiah (jt = juta / million, M = miliar / billion) · {periodLabel} · per {trend.granularity === "day" ? "day" : "month"}
          </p>
        </div>
        <div role="group" aria-label="Split chart by" className="inline-flex rounded-lg border bg-muted p-1">
          {OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              aria-pressed={by === o.value}
              onClick={() => setBy(o.value)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-semibold transition",
                by === o.value ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {hasData ? (
        <div ref={el} className="h-[380px] w-full" role="img" aria-label={`Line chart of deal value per ${trend.granularity}`} />
      ) : (
        <p className="py-16 text-center text-sm text-muted-foreground">No deals in this period.</p>
      )}
    </div>
  );
}

import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { compactIDR } from "@/lib/format";
import { compareValues } from "@/lib/trend-helpers";
import { cn } from "@/lib/utils";

/** "+Rp 120 jt (+14%) vs last month · Rp 800 jt vs Rp 680 jt": green up, red down, grey flat. */
export function TrendBadge({
  current,
  previous,
  large,
  detail = true,
  versus = "month",
}: {
  current: number;
  previous: number;
  large?: boolean;
  /** Append the raw "current vs previous" figures. */
  detail?: boolean;
  /** What the previous period is: "last month" or "last year". */
  versus?: "month" | "year";
}) {
  const { diff, pct, dir } = compareValues(current, previous);
  const Icon = dir === "up" ? TrendingUp : dir === "down" ? TrendingDown : Minus;
  const sign = dir === "up" ? "+" : dir === "down" ? "-" : "";
  return (
    <span
      className={cn(
        "inline-flex flex-wrap items-center gap-x-1.5 rounded-full font-semibold",
        large ? "px-3.5 py-1.5 text-sm" : "px-2.5 py-0.5 text-xs",
        dir === "up" && "bg-emerald-100 text-emerald-900",
        dir === "down" && "bg-red-100 text-red-900",
        dir === "flat" && "bg-muted text-muted-foreground",
      )}
    >
      <Icon className={large ? "size-4" : "size-3.5"} aria-hidden />
      <span>
        {dir === "flat" ? "No change" : `${sign}${compactIDR(Math.abs(diff))}${pct === null ? "" : ` (${sign}${Math.abs(pct)}%)`}`} vs last {versus}
        {detail && (
          <span className="font-medium opacity-80">
            {" · "}
            {compactIDR(current)} vs {compactIDR(previous)}
          </span>
        )}
      </span>
    </span>
  );
}

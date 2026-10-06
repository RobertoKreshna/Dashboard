import { cn } from "@/lib/utils";
import { listingTypeLabel, statusLabel } from "@/lib/constants";

const base = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap";

export function TypeBadge({ type }: { type: string }) {
  return (
    <span
      className={cn(
        base,
        type === "sell" || type === "sale"
          ? "bg-yellow-100 text-yellow-900"
          : "bg-sky-100 text-sky-900",
      )}
    >
      {type === "sale" ? "Sale" : type === "rent" ? "Rent" : listingTypeLabel(type)}
    </span>
  );
}

const statusStyles: Record<string, string> = {
  available: "bg-emerald-100 text-emerald-900",
  reserved: "bg-orange-100 text-orange-900",
  sold: "bg-slate-200 text-slate-800",
  rented: "bg-violet-100 text-violet-900",
};

export function StatusBadge({ status }: { status: string }) {
  return <span className={cn(base, statusStyles[status] ?? "bg-muted")}>{statusLabel(status)}</span>;
}

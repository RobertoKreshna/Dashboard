"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useListPanel } from "@/components/listings/list-panel";

export function Pagination({
  basePath,
  searchParams,
  page,
  pages,
  total,
}: {
  basePath: string;
  searchParams: Record<string, string | string[] | undefined>;
  page: number;
  pages: number;
  total: number;
}) {
  const panel = useListPanel();
  const href = (p: number) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(searchParams)) {
      const val = Array.isArray(v) ? v[0] : v;
      if (val !== undefined && k !== "page") qs.set(k, val);
    }
    if (p > 1) qs.set("page", String(p));
    const s = qs.toString();
    return s ? `${basePath}?${s}` : basePath;
  };
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
      <span>
        {total.toLocaleString("id-ID")} result{total === 1 ? "" : "s"} · page {page} of {pages}
      </span>
      <div className="flex gap-2">
        <Link
          aria-disabled={page <= 1}
          href={href(page - 1)}
          scroll={!panel}
          onClick={(e) => {
            if (!panel || e.metaKey || e.ctrlKey || e.shiftKey) return;
            e.preventDefault();
            panel.navigate(href(page - 1));
          }}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), page <= 1 && "pointer-events-none opacity-50")}
        >
          <ChevronLeft /> Prev
        </Link>
        <Link
          aria-disabled={page >= pages}
          href={href(page + 1)}
          scroll={!panel}
          onClick={(e) => {
            if (!panel || e.metaKey || e.ctrlKey || e.shiftKey) return;
            e.preventDefault();
            panel.navigate(href(page + 1));
          }}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), page >= pages && "pointer-events-none opacity-50")}
        >
          Next <ChevronRight />
        </Link>
      </div>
    </div>
  );
}

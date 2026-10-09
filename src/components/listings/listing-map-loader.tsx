"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

const ListingMap = dynamic(() => import("./listing-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[380px] items-center justify-center rounded-xl border bg-brand-light/20 sm:h-[480px]" role="status">
      <span className="flex items-center gap-2 rounded-full border border-brand-light bg-white px-3.5 py-1.5 text-sm font-medium text-brand-ink shadow-md">
        <Loader2 className="size-4 animate-spin text-brand" /> Loading map…
      </span>
    </div>
  ),
});

export { ListingMap };

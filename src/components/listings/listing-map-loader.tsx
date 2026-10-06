"use client";

import dynamic from "next/dynamic";

const ListingMap = dynamic(() => import("./listing-map"), {
  ssr: false,
  loading: () => <div className="h-[380px] animate-pulse rounded-xl bg-muted sm:h-[480px]" />,
});

export { ListingMap };

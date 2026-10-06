"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export type Hover = { id: string; city: string; province: string; district: string; village: string; source: "list" | "map" } | null;

type Ctx = { hover: Hover; setHover: (h: Hover) => void };
const HoverContext = React.createContext<Ctx>({ hover: null, setHover: () => {} });

/** Shares "which listing is hovered" between the map and the list beside it. */
export function MapHoverProvider({ children }: { children: React.ReactNode }) {
  const [hover, setHover] = React.useState<Hover>(null);
  const value = React.useMemo(() => ({ hover, setHover }), [hover]);
  return <HoverContext.Provider value={value}>{children}</HoverContext.Provider>;
}

export const useMapHover = () => React.useContext(HoverContext);

/** Wraps a listing card: hovering it highlights the map; hovering a dot highlights (and scrolls to) the card. */
export function HoverCard({
  id,
  city,
  province,
  district,
  village,
  children,
}: {
  id: string;
  city: string;
  province: string;
  district: string;
  village: string;
  children: React.ReactNode;
}) {
  const { hover, setHover } = useMapHover();
  const ref = React.useRef<HTMLDivElement>(null);
  const active = hover?.id === id;

  React.useEffect(() => {
    if (active && hover?.source === "map") ref.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [active, hover?.source]);

  return (
    <div
      ref={ref}
      onMouseEnter={() => setHover({ id, city, province, district, village, source: "list" })}
      onMouseLeave={() => setHover(null)}
      onFocus={() => setHover({ id, city, province, district, village, source: "list" })}
      onBlur={() => setHover(null)}
      className={cn("rounded-xl transition-shadow", active && "ring-2 ring-primary ring-offset-2 ring-offset-background")}
    >
      {children}
    </div>
  );
}

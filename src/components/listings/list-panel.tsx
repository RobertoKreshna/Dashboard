"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

type Ctx = { navigate: (href: string) => void; pending: boolean };
const ListPanelContext = React.createContext<Ctx | null>(null);
export const useListPanel = () => React.useContext(ListPanelContext);

/**
 * Scroll container for the results list. Pagination inside it navigates in a transition without scrolling the
 * page, dims the list while the next page loads, and scrolls the list back to the top when it arrives.
 */
export function ListPanel({ className, children }: { className?: string; children: React.ReactNode }) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, start] = React.useTransition();
  const ref = React.useRef<HTMLDivElement>(null);
  const page = params.get("page") ?? "1";
  const first = React.useRef(true);

  React.useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const node = ref.current;
    if (!node) return;
    // Desktop: the list scrolls inside its own panel. Mobile: the list is part of the page.
    if (window.matchMedia("(min-width: 1024px)").matches) node.scrollTo({ top: 0, behavior: "smooth" });
    else node.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [page]);

  const value = React.useMemo<Ctx>(
    () => ({
      navigate: (href) => start(() => router.push(href, { scroll: false })),
      pending,
    }),
    [router, pending],
  );

  return (
    <ListPanelContext.Provider value={value}>
      <div ref={ref} aria-busy={pending} className={cn(className, "transition-opacity", pending && "opacity-60")}>
        {children}
      </div>
    </ListPanelContext.Provider>
  );
}

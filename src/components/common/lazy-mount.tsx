"use client";

import * as React from "react";

/** Renders `children` only once this box is near the viewport, so heavy widgets below the fold don't load up front. */
export function LazyMount({ fallback, rootMargin = "300px", children }: { fallback: React.ReactNode; rootMargin?: string; children: React.ReactNode }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [show, setShow] = React.useState(false);

  React.useEffect(() => {
    const node = ref.current;
    if (!node || show) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShow(true);
          io.disconnect();
        }
      },
      { rootMargin },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [show, rootMargin]);

  return <div ref={ref} className="h-full">{show ? children : fallback}</div>;
}

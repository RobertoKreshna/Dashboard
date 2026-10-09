import "server-only";
import { revalidateTag, unstable_cache } from "next/cache";

const TAG = "dashboard";

/**
 * Caches a dashboard query for a minute, so flipping the chart's Total / payment / sales split (which re-renders
 * the page) doesn't re-run the map, stats and top-sales queries. Arguments become part of the cache key.
 * Anything that changes listings, deals or sales codes must call `invalidateDashboard()`.
 */
export function dashCache<A extends unknown[], R>(fn: (...args: A) => Promise<R>, key: string) {
  return unstable_cache(fn, ["dashboard", key], { tags: [TAG], revalidate: 60 });
}

export function invalidateDashboard() {
  revalidateTag(TAG, { expire: 0 });
}

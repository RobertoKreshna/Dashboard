import type { MetadataRoute } from "next";
import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { publicListings } from "@/db/schema";
import { siteUrl } from "@/lib/site";

// Rendered per request, not at build time: the build runs many workers and would exhaust the DB pooler.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const rows = await db
    .select({ id: publicListings.id, updatedAt: publicListings.updatedAt })
    .from(publicListings)
    .where(inArray(publicListings.status, ["available", "reserved"]));
  return [
    { url: `${base}/listings-public`, changeFrequency: "daily", priority: 1 },
    ...rows.map((r) => ({
      url: `${base}/listings-public/${encodeURIComponent(r.id)}`,
      lastModified: r.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}

import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/listings-public", disallow: ["/", "/login", "/deals", "/listings/", "/sales-codes", "/activity"] }],
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}

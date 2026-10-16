import type { MetadataRoute } from "next";
import { siteOrigin, siteSettings } from "@/lib/public-platform";
export const dynamic = "force-static";
export default function robots(): MetadataRoute.Robots {
  // Even when noindex is enabled, allow crawlers to see the noindex metadata/headers.
  return { rules: { userAgent: "*", allow: "/", disallow: ["/admin/", "/admin$", "/api/"] }, ...(siteSettings.indexSite ? { sitemap: `${siteOrigin}/sitemap.xml` } : {}) };
}

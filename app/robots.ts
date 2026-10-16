import type { MetadataRoute } from "next";
import { publicSiteUrl } from "@/lib/models";

export const dynamic = "force-static";
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: "/", disallow: ["/admin/", "/admin$", "/api/"] },
    sitemap: `${publicSiteUrl(process.env.NEXT_PUBLIC_SITE_URL)}/sitemap.xml` };
}

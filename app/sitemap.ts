import type { MetadataRoute } from "next";
import { categoryDirectory, channelDirectory, videos } from "@/lib/demo-content";
import { modelSnapshot, performers } from "@/lib/public-models";
import { publicSiteUrl } from "@/lib/models";

export const dynamic = "force-static";
export default function sitemap(): MetadataRoute.Sitemap {
  const site = publicSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
  const updated = new Map(modelSnapshot.models.map((model) => [model.slug, model.updatedAt]));
  return [
    ...["/", "/pornstars/", "/channels/", "/categories/"].map((path) => ({ url: site + path })),
    ...performers.filter((model) => model.source !== "demo").map((model) => ({ url: `${site}/${model.slug}/`, lastModified: updated.get(model.slug) })),
    ...channelDirectory.map((channel) => ({ url: `${site}/${channel.slug}/` })),
    ...categoryDirectory.map((category) => ({ url: `${site}/categories/${category.slug}/` })),
    ...videos.map((video) => ({ url: `${site}/video/${video.id}/` })),
  ];
}

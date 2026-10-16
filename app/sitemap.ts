import type { MetadataRoute } from "next";
import { videos } from "@/lib/demo-content";
import { categoryDirectory, channelDirectory, informationPages, publicRobots, siteOrigin, siteSettings } from "@/lib/public-platform";
import { performers, modelSnapshot } from "@/lib/public-models";
export const dynamic = "force-static";
export default function sitemap(): MetadataRoute.Sitemap {
  if (!siteSettings.indexSite) return [];
  const updated = new Map(modelSnapshot.models.map((model) => [model.slug, model.updatedAt]));
  return [
    { url: `${siteOrigin}/` },
    ...(siteSettings.indexModels ? [{ url: `${siteOrigin}/pornstars/` }] : []),
    ...(siteSettings.indexChannels ? [{ url: `${siteOrigin}/channels/` }] : []),
    ...(siteSettings.indexCategories ? [{ url: `${siteOrigin}/categories/` }] : []),
    ...performers.filter((model) => publicRobots("models", model.source === "demo").index).map((model) => ({ url: `${siteOrigin}/${model.slug}/`, lastModified: updated.get(model.slug) })),
    ...channelDirectory.filter((channel) => publicRobots("channels", channel.source === "demo").index).map((channel) => ({ url: `${siteOrigin}/${channel.slug}/` })),
    ...categoryDirectory.filter((category) => publicRobots("categories", category.source === "demo").index).map((category) => ({ url: `${siteOrigin}/categories/${category.slug}/` })),
    ...informationPages.filter((page) => publicRobots("pages").index && !page.noindex).map((page) => ({ url: `${siteOrigin}/${page.slug}/`, lastModified: page.updatedAt })),
    ...videos.map((video) => ({ url: `${siteOrigin}/video/${video.id}/` })),
  ];
}

import { videos, type DirectoryCategory, type DirectoryChannel } from "./demo-content";
export type CatalogCardRecord = { id: number | string; kind: "channel" | "category"; slug: string; name: string; imageUrl: string; imageAlt?: string; source: "admin" | "demo"; createdAt?: string; description?: string; seoTitle?: string; metaDescription?: string };
export function catalogProfile(entry: CatalogCardRecord): DirectoryChannel & DirectoryCategory {
  const appearances = entry.source === "demo" ? videos.filter((video) => entry.kind === "channel" ? video.channel === entry.name : video.categories.includes(entry.slug)) : [];
  const total = appearances.reduce((sum, video) => sum + video.viewCount, 0), count = appearances.length;
  return { id: entry.id, slug: entry.slug, name: entry.name, image: entry.imageUrl, imageAlt: entry.imageAlt || `${entry.name} thumbnail`,
    source: entry.source, createdAt: entry.createdAt, description: entry.description ?? "", seoTitle: entry.seoTitle,
    seoDescription: entry.metaDescription || entry.description || `Browse ${entry.name}.`, videoCount: count, videos: `${count} ${count === 1 ? "video" : "videos"}`,
    totalViews: new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(total) };
}

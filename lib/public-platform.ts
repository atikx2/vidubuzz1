import rawSnapshot from "../.generated/platform.json";
import { channelDirectory as demoChannels, categoryDirectory as demoCategories } from "./demo-content";
import { catalogProfile } from "./catalog-public";
import { DEFAULT_SITE_SETTINGS, catalogDescription, type PlatformSnapshot } from "./platform";
import { publicSiteUrl } from "./models";
export const platformSnapshot = rawSnapshot as unknown as PlatformSnapshot;
export const siteSettings = platformSnapshot.source === "d1" ? platformSnapshot.settings : DEFAULT_SITE_SETTINGS;
export const siteOrigin = siteSettings.siteUrl || publicSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
export const informationPages = platformSnapshot.pages;
export const channelDirectory = platformSnapshot.source === "d1" ? platformSnapshot.entries.filter((entry) => entry.kind === "channel").map((entry) => ({
  ...catalogProfile(entry), seoDescription: catalogDescription(entry.name, entry.description, entry.metaDescription),
})) : demoChannels.map((entry) => catalogProfile({ ...entry, kind: "channel", source: "demo", imageUrl: entry.image, metaDescription: entry.seoDescription }));
export const categoryDirectory = platformSnapshot.source === "d1" ? platformSnapshot.entries.filter((entry) => entry.kind === "category").map((entry) => ({
  ...catalogProfile(entry), seoDescription: catalogDescription(entry.name, entry.description, entry.metaDescription),
})) : demoCategories.map((entry) => catalogProfile({ ...entry, kind: "category", source: "demo", imageUrl: entry.image, metaDescription: entry.seoDescription }));
export function publicRobots(kind?: "models" | "channels" | "categories" | "pages", demo = false) {
  const enabled = kind === "models" ? siteSettings.indexModels : kind === "channels" ? siteSettings.indexChannels : kind === "categories" ? siteSettings.indexCategories : kind === "pages" ? siteSettings.indexPages : true;
  return { index: siteSettings.indexSite && enabled && !demo, follow: true };
}

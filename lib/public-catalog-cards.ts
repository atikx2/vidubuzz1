import rawIndex from "../.generated/platform-index.json";
import { channelDirectory as demoChannels, categoryDirectory as demoCategories } from "./demo-content";
import { catalogProfile, type CatalogCardRecord } from "./catalog-public";
const index = rawIndex as { source: "demo" | "d1"; brandName: string; entries: CatalogCardRecord[] };
export const publicBrandName = index.brandName;
export const channelDirectory = index.source === "d1" ? index.entries.filter((entry) => entry.kind === "channel").map(catalogProfile)
  : demoChannels.map((entry) => catalogProfile({ id: entry.id, kind: "channel", slug: entry.slug, name: entry.name, imageUrl: entry.image, source: "demo" }));
export const categoryDirectory = index.source === "d1" ? index.entries.filter((entry) => entry.kind === "category").map(catalogProfile)
  : demoCategories.map((entry) => catalogProfile({ id: entry.id, kind: "category", slug: entry.slug, name: entry.name, imageUrl: entry.image, source: "demo" }));

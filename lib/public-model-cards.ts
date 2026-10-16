import rawIndex from "../.generated/model-index.json";
import { performers as demoPerformers, videos, type PerformerProfile } from "./demo-content";
import type { PublicModelRecord } from "./models";

type IndexRecord = Pick<PublicModelRecord, "id" | "name" | "slug" | "countryCode" | "age" | "imageUrl" | "imageAlt" | "createdAt" | "source">;
export type PublicModelCard = Omit<PerformerProfile, "description" | "seoDescription" | "seoTitle" | "totalViews">;
const index = rawIndex as { source: "demo" | "d1"; models: IndexRecord[] };
// Compact card-only data. Full biographies are rendered only by server/build-time detail pages.
export const performers: PublicModelCard[] = index.source === "d1" ? index.models.map((model, number) => {
  const videoCount = model.source === "demo" ? videos.filter((video) => video.actors.includes(model.name)).length : 0;
  return { id: model.id, name: model.name, slug: model.slug, countryCode: model.countryCode, age: model.age,
    image: model.imageUrl, imageAlt: model.imageAlt, createdAt: model.createdAt, source: model.source,
    videoCount, videos: `${videoCount} ${videoCount === 1 ? "video" : "videos"}`, tone: ["portrait-one", "portrait-two", "portrait-three"][number % 3] };
}) : demoPerformers.map(({ description: _description, seoDescription: _meta, seoTitle: _title, totalViews: _views, ...model }) =>
  ({ ...model, source: "demo" as const, countryCode: null, age: null }));

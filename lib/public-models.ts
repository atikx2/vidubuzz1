import rawSnapshot from "../.generated/models.json";
import { channelDirectory, performers as demoPerformers, videos, type PerformerProfile } from "./demo-content";
import { modelDescription, type ModelSnapshot } from "./models";

// Generated only at build time. This JSON contains published public fields, never drafts or credentials.
export const modelSnapshot = rawSnapshot as ModelSnapshot;
export const performers: PerformerProfile[] = modelSnapshot.source === "d1" ? modelSnapshot.models.map((model, index) => {
  // Demo videos are not real associations for a newly managed profile. Video linking is a later editor chunk.
  const appearances = model.source === "demo" ? videos.filter((video) => video.actors.includes(model.name)) : [];
  const views = appearances.reduce((sum, video) => sum + video.viewCount, 0);
  return { id: model.id, name: model.name, slug: model.slug, countryCode: model.countryCode, age: model.age,
    image: model.imageUrl, imageAlt: model.imageAlt || `${model.name} portrait`, description: model.description,
    seoTitle: model.seoTitle, seoDescription: modelDescription(model.name, model.description, model.metaDescription),
    createdAt: model.createdAt, source: model.source, videoCount: appearances.length,
    videos: `${appearances.length} ${appearances.length === 1 ? "video" : "videos"}`,
    totalViews: new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(views),
    tone: ["portrait-one", "portrait-two", "portrait-three"][index % 3] };
}) : demoPerformers.map((model) => ({ ...model, source: "demo" as const, countryCode: null, age: null }));

const slugs = [...channelDirectory.map((channel) => channel.slug), ...performers.map((model) => model.slug)];
if (new Set(slugs).size !== slugs.length) throw new Error("Public model/channel slugs conflict. Resolve the model slug before publishing.");

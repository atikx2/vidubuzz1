export const MODEL_STATUSES = ["draft", "published", "archived"] as const;
export type ModelStatus = (typeof MODEL_STATUSES)[number];
export { COUNTRY_OPTIONS } from "./countries";
import { COUNTRY_OPTIONS } from "./countries";
export const COUNTRY_CODES = COUNTRY_OPTIONS.map((country) => country.code);
const countries = new Map(COUNTRY_OPTIONS.map((country) => [country.code, country.name]));
export function countryName(code: string | null | undefined) { return code ? countries.get(code) ?? code : ""; }
export function isCountryCode(code: unknown): code is string { return typeof code === "string" && countries.has(code); }


export type ManagedModel = {
  id: string; name: string; slug: string; countryCode: string | null; age: number | null;
  description: string; seoTitle: string; metaDescription: string; imageAlt: string;
  photoAssetId: string | null; imageUrl: string | null; adultConfirmed: boolean;
  status: ModelStatus; source: "admin" | "demo"; revision: number; createdAt: string; updatedAt: string;
};
export type ModelInput = {
  id?: string; revision?: number; name: string; slug: string; countryCode: string | null; age: number | null;
  description: string; seoTitle: string; metaDescription: string; imageAlt: string; photoAssetId: string | null;
  adultConfirmed: boolean; status: ModelStatus;
};
export type ModelList = {
  models: ManagedModel[]; page: number; total: number; totalPages: number;
  stats: { total: number; published: number; drafts: number; archived: number };
};
export type ModelConfig = {
  migrationApplied: boolean; publishingConfigured: boolean; publishMissing: string[];
  snapshotSource: "demo" | "d1"; snapshotBuiltAt: string | null; publicSiteUrl: string;
};
export type PublicModelRecord = {
  id: string; name: string; slug: string; countryCode: string | null; age: number | null;
  description: string; seoTitle: string; metaDescription: string; imageAlt: string;
  imageUrl: string; createdAt: string; updatedAt: string; revision: number; source: "admin" | "demo";
};
export type ModelSnapshot = { version: 1; source: "demo" | "d1"; builtAt: string | null; models: PublicModelRecord[] };

export function slugifyModel(name: string) {
  return name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80).replace(/-+$/, "");
}
export function modelMetaDescription(description: string) {
  const text = description.replace(/\s+/g, " ").trim();
  if (text.length <= 160) return text;
  const cut = text.slice(0, 157); const boundary = cut.lastIndexOf(" ");
  return `${cut.slice(0, boundary > 110 ? boundary : cut.length)}…`;
}
export function modelSeoTitle(name: string, custom?: string) { return custom?.trim() || `${name} Profile & Videos | Vidubuzz`; }
export function modelDescription(name: string, description: string, custom?: string) { return custom?.trim() || modelMetaDescription(description) || `Explore ${name}'s profile and video appearances on Vidubuzz.`; }
export function safeJsonLd(value: unknown) { return JSON.stringify(value).replace(/</g, "\\u003c"); }
export function publicSiteUrl(value?: string) {
  try { const url = new URL(value || "https://vidubuzz.top"); if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash || url.pathname !== "/") throw new Error("Invalid site origin"); return url.origin; }
  catch { return "https://vidubuzz.top"; }
}

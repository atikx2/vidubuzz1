import {
  isCountryCode, MODEL_STATUSES, publicSiteUrl, type ManagedModel, type ModelConfig, type ModelInput, type ModelStatus,
} from "../../lib/models";
import { ApiError } from "./admin-auth";
import { storageSetup, type MediaEnv } from "./r2-media";
import { publicAssetUrl } from "../../lib/media-assets";

export interface ModelEnv extends MediaEnv {
  D1_DATABASE_ID?: string;
  D1_READ_TOKEN?: string;
  PAGES_DEPLOY_HOOK?: string;
  NEXT_PUBLIC_SITE_URL?: string;
}
export type ModelRow = {
  id: string; name: string; slug: string; country_code: string | null; age: number | null;
  description: string; seo_title: string; meta_description: string; image_alt: string;
  photo_asset_id: string | null; demo_image_path: string | null; adult_confirmed: number;
  status: ModelStatus; source: "admin" | "demo"; revision: number; created_at: string; updated_at: string;
  object_key?: string | null;
};
export const MODEL_SELECT = "SELECT m.*, a.object_key FROM models m LEFT JOIN media_assets a ON a.id = m.photo_asset_id";
export const MODEL_ID_PATTERN = /^(?:[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}|demo-[a-z0-9-]+)$/i;
export const MODEL_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function modelFromRow(row: ModelRow, env: ModelEnv): ManagedModel {
  const base = storageSetup(env).publicBaseUrl;
  const imageUrl = row.object_key && base ? publicAssetUrl(base, row.object_key)
    : row.source === "demo" && row.demo_image_path?.startsWith("/media/") ? row.demo_image_path : null;
  return { id: row.id, name: row.name, slug: row.slug, countryCode: row.country_code, age: row.age,
    description: row.description, seoTitle: row.seo_title, metaDescription: row.meta_description, imageAlt: row.image_alt,
    photoAssetId: row.photo_asset_id, imageUrl, adultConfirmed: Boolean(row.adult_confirmed), status: row.status,
    source: row.source, revision: row.revision, createdAt: row.created_at, updatedAt: row.updated_at };
}

function plainText(value: unknown, name: string, max: number, required = false) {
  if (typeof value !== "string" || value.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)
    || /<\/?[a-z][^>]*>/i.test(value)) throw new ApiError(`${name} must be plain text, up to ${max} characters.`, 400);
  const result = value.trim();
  if (required && !result) throw new ApiError(`${name} is required.`, 400);
  return result;
}

export function validateModel(body: Record<string, unknown>): ModelInput {
  const countryCode = body.countryCode ?? null;
  const age = body.age ?? null;
  const photoAssetId = body.photoAssetId ?? null;
  const status = body.status ?? "draft";
  const name = plainText(body.name, "Model name", 100, true);
  const slug = plainText(body.slug, "Slug", 80, true);
  if (!MODEL_SLUG_PATTERN.test(slug)) throw new ApiError("Use a lowercase URL slug with letters, numbers and single hyphens.", 400);
  if (countryCode !== null && !isCountryCode(countryCode)) throw new ApiError("Choose a valid country or leave it empty.", 400);
  if (age !== null && (typeof age !== "number" || !Number.isInteger(age) || age < 18 || age > 120)) throw new ApiError("Age is optional; if provided it must be a verified adult age from 18 to 120.", 400);
  if (body.adultConfirmed !== true) throw new ApiError("Confirm that this model is an adult (18+) before saving. Do not guess an age.", 400);
  if (typeof status !== "string" || !MODEL_STATUSES.includes(status as ModelStatus)) throw new ApiError("Invalid model visibility.", 400);
  if (photoAssetId !== null && (typeof photoAssetId !== "string" || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(photoAssetId))) throw new ApiError("Select a verified image from the R2 media library.", 400);
  if (body.id !== undefined && (typeof body.id !== "string" || !MODEL_ID_PATTERN.test(body.id))) throw new ApiError("Invalid model identifier.", 400);
  if (body.id !== undefined && (typeof body.revision !== "number" || !Number.isSafeInteger(body.revision) || body.revision < 1)) throw new ApiError("Missing model revision. Reload the model before editing.", 400);
  const description = plainText(body.description, "Description", 8000, true);
  return { ...(body.id ? { id: body.id as string, revision: body.revision as number } : {}), name, slug,
    countryCode: countryCode as string | null, age: age as number | null, description,
    seoTitle: plainText(body.seoTitle ?? "", "SEO title", 100), metaDescription: plainText(body.metaDescription ?? "", "Meta description", 300),
    imageAlt: plainText(body.imageAlt ?? "", "Image alt text", 160), photoAssetId: photoAssetId as string | null,
    adultConfirmed: true, status: status as ModelStatus };
}

export function validDeployHook(value?: string) {
  if (!value) return false;
  try { const url = new URL(value); return url.protocol === "https:" && url.hostname === "api.cloudflare.com" && !url.port && !url.username && !url.password && !url.search && !url.hash && /^\/client\/v4\/pages\/webhooks\/deploy_hooks\/[a-zA-Z0-9_-]+$/.test(url.pathname); }
  catch { return false; }
}

export async function modelConfig(env: ModelEnv, snapshot: { source: "demo" | "d1"; builtAt: string | null }): Promise<ModelConfig> {
  let migrationApplied = false;
  try { await env.DB!.prepare("SELECT m.id FROM models m LEFT JOIN media_assets a ON a.id = m.photo_asset_id LEFT JOIN content_slugs s ON s.slug = m.slug LIMIT 1").first(); migrationApplied = true; } catch { /* Safe setup state until migration 0003. */ }
  const publishMissing: string[] = [];
  if (!/^[a-f0-9]{32}$/i.test(env.R2_ACCOUNT_ID || "")) publishMissing.push("R2_ACCOUNT_ID");
  if (!/^[a-z0-9-]{20,64}$/i.test(env.D1_DATABASE_ID || "")) publishMissing.push("D1_DATABASE_ID");
  if (!storageSetup(env).publicBaseUrl) publishMissing.push("R2_PUBLIC_BASE_URL");
  if (!env.D1_READ_TOKEN) publishMissing.push("D1_READ_TOKEN");
  if (!validDeployHook(env.PAGES_DEPLOY_HOOK)) publishMissing.push("PAGES_DEPLOY_HOOK");
  return { migrationApplied, publishingConfigured: migrationApplied && publishMissing.length === 0, publishMissing,
    snapshotSource: snapshot.source, snapshotBuiltAt: snapshot.builtAt, publicSiteUrl: publicSiteUrl(env.NEXT_PUBLIC_SITE_URL) };
}

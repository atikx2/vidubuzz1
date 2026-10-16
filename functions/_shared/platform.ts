import { ApiError, type D1Database } from "./admin-auth";
import { modelConfig, type ModelEnv } from "./models";
import { storageSetup } from "./r2-media";
import { publicAssetUrl } from "../../lib/media-assets";
import { publicSiteUrl, MODEL_STATUSES } from "../../lib/models";
import { CATALOG_KINDS, INFORMATION_SLUGS, hasStarterCopy, objectValue, plainText, validateSiteSettings,
  type CatalogInput, type CatalogKind, type InformationPage, type ManagedCatalogEntry, type PlatformConfig, type SettingsRecord } from "../../lib/platform";

export type PlatformEnv = ModelEnv;
export type CatalogRow = {
  id: string; kind: CatalogKind; slug: string; name: string; description: string; seo_title: string; meta_description: string;
  image_alt: string; photo_asset_id: string | null; demo_image_path: string | null; status: CatalogInput["status"];
  source: "admin" | "demo"; revision: number; created_at: string; updated_at: string; object_key?: string | null;
};
export type PageRow = { slug: InformationPage["slug"]; title: string; description: string; body: string; status: InformationPage["status"];
  review_confirmed: number; noindex: number; revision: number; updated_at: string };
export const CATALOG_SELECT = "SELECT c.*, a.object_key FROM catalog_entries c LEFT JOIN media_assets a ON a.id = c.photo_asset_id";
export function catalogFromRow(row: CatalogRow, env: PlatformEnv): ManagedCatalogEntry {
  const base = storageSetup(env).publicBaseUrl;
  return { id: row.id, kind: row.kind, name: row.name, slug: row.slug, description: row.description, seoTitle: row.seo_title,
    metaDescription: row.meta_description, imageAlt: row.image_alt, photoAssetId: row.photo_asset_id,
    imageUrl: row.object_key && base ? publicAssetUrl(base, row.object_key) : row.source === "demo" && row.demo_image_path?.startsWith("/media/") ? row.demo_image_path : null,
    status: row.status, source: row.source, revision: row.revision, createdAt: row.created_at, updatedAt: row.updated_at };
}
export function pageFromRow(row: PageRow): InformationPage {
  return { slug: row.slug, title: row.title, description: row.description, body: row.body, status: row.status,
    reviewConfirmed: row.review_confirmed === 1, noindex: row.noindex === 1, revision: row.revision, updatedAt: row.updated_at };
}
export function validate<T>(callback: () => T): T { try { return callback(); } catch (error) { if (error instanceof ApiError) throw error; throw new ApiError(error instanceof Error ? error.message : "Invalid fields.", 400); } }
export function revision(value: unknown) { if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1) throw new Error("Reload this record before saving; its revision is missing."); return value; }
export function validateCatalog(body: Record<string, unknown>): CatalogInput {
  return validate(() => {
    const kind = body.kind as CatalogKind;
    if (!CATALOG_KINDS.includes(kind)) throw new Error("Choose channels or categories.");
    const name = plainText(body.name, `${kind === "channel" ? "Channel" : "Category"} name`, 100, true);
    const slug = plainText(body.slug, "URL slug", 80, true);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error("Use lowercase letters, numbers and single hyphens for the URL slug.");
    const status = body.status ?? "draft";
    if (!MODEL_STATUSES.includes(status as CatalogInput["status"])) throw new Error("Invalid visibility.");
    const photo = body.photoAssetId ?? null;
    if (photo !== null && (typeof photo !== "string" || !/^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(photo))) throw new Error("Choose a verified image from your media library.");
    const description = plainText(body.description ?? "", "Description", 8000, status === "published");
    if (body.id !== undefined && (typeof body.id !== "string" || !/^(?:[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}|demo-(?:channel|category)-[a-z0-9-]+)$/i.test(body.id))) throw new Error("Invalid record identifier.");
    return { ...(body.id ? { id: body.id as string, revision: revision(body.revision) } : {}), kind, name, slug, description,
      seoTitle: plainText(body.seoTitle ?? "", "SEO title", 100), metaDescription: plainText(body.metaDescription ?? "", "Meta description", 300),
      imageAlt: plainText(body.imageAlt ?? "", "Image description", 160), photoAssetId: photo as string | null, status: status as CatalogInput["status"] };
  });
}
export async function readSettings(db: D1Database): Promise<SettingsRecord> {
  const row = await db.prepare("SELECT settings_json, revision, updated_at FROM site_settings WHERE id = 1")
    .first<{ settings_json: string; revision: number; updated_at: string }>();
  if (!row) throw new ApiError("Apply the complete migrations/0004_workspace.sql to your existing DB database.", 503);
  return { settings: validateSiteSettings(JSON.parse(row.settings_json)), revision: row.revision, updatedAt: row.updated_at };
}
export function validatePage(body: Record<string, unknown>): Omit<InformationPage, "updatedAt"> {
  return validate(() => {
    if (typeof body.slug !== "string" || !INFORMATION_SLUGS.includes(body.slug)) throw new Error("Unknown information page.");
    if (body.status !== "draft" && body.status !== "published") throw new Error("Invalid page status.");
    if (typeof body.reviewConfirmed !== "boolean" || typeof body.noindex !== "boolean") throw new Error("Review and indexing controls must be true or false.");
    const title = plainText(body.title, "Page title", 140, true);
    const description = plainText(body.description ?? "", "Page description", 300, body.status === "published");
    const content = plainText(body.body ?? "", "Page content", 40000, body.status === "published");
    if (body.status === "published" && (!body.reviewConfirmed || hasStarterCopy(content))) {
      throw new Error("Replace the starter text with your actual policy/contact information and confirm you have reviewed it before publishing.");
    }
    return { slug: body.slug as InformationPage["slug"], title, description, body: content, status: body.status,
      reviewConfirmed: body.reviewConfirmed, noindex: body.noindex, revision: revision(body.revision) };
  });
}
export async function platformConfig(env: PlatformEnv, snapshot: { source: "demo" | "d1"; builtAt: string | null }): Promise<PlatformConfig> {
  const base = await modelConfig(env, snapshot);
  let migrationApplied = false;
  let canonical = base.publicSiteUrl;
  try {
    const settings = await readSettings(env.DB!);
    canonical = settings.settings.siteUrl || publicSiteUrl(env.NEXT_PUBLIC_SITE_URL);
    const row = await env.DB!.prepare(`SELECT (SELECT COUNT(*) FROM site_pages) AS pages,
      (SELECT COUNT(*) FROM content_slugs WHERE entity_type = 'system' AND slug IN ('about','contact','privacy','terms','content-removal')) AS reserved,
      (SELECT COUNT(*) FROM catalog_entries) AS entries`).first<{ pages: number; reserved: number; entries: number }>();
    migrationApplied = Boolean(base.migrationApplied && row?.pages === 5 && row.reserved === 5);
  } catch { /* Return a usable setup screen before migration 0004 exists. */ }
  const storage = storageSetup(env);
  const buildMissing = base.publishMissing.filter((name) => name !== "PAGES_DEPLOY_HOOK");
  const missing = [...(!migrationApplied ? ["migrations/0004_workspace.sql"] : []), ...base.publishMissing];
  return { migrationApplied, publishingConfigured: migrationApplied && base.publishingConfigured, publishMissing: missing,
    snapshotSource: snapshot.source, snapshotBuiltAt: snapshot.builtAt, publicSiteUrl: canonical,
    connections: [
      { key: "database", name: "D1 database", state: base.migrationApplied ? "ready" : "missing", message: base.migrationApplied ? "Admin and model tables are reachable through the existing DB binding." : "Check the DB binding and migrations 0001–0003." },
      { key: "workspace", name: "Workspace schema", state: migrationApplied ? "ready" : "missing", message: migrationApplied ? "Channels, categories, settings, pages and reserved URLs are ready." : "Apply migration 0004 to the same database. No password reset is needed.", ...(!migrationApplied ? { missing: ["migrations/0004_workspace.sql"] } : {}) },
      { key: "storage", name: "R2 uploads", state: storage.configured ? "ready" : "missing", message: storage.configured ? "Upload bindings/settings are present. A real upload verifies the credentials and CORS." : "Finish the existing R2 setup in the Media library.", missing: storage.missing },
      { key: "build", name: "Static content export", state: buildMissing.length ? "missing" : "ready", message: buildMissing.length ? "Set the missing build variables privately in Pages." : "Build-read variables are present, not live-tested here. The next build validates D1 access.", missing: buildMissing },
      { key: "publish", name: "Pages publish hook", state: base.publishMissing.includes("PAGES_DEPLOY_HOOK") ? "missing" : "ready", message: base.publishMissing.includes("PAGES_DEPLOY_HOOK") ? "Add the branch-specific Pages deploy hook as a private secret." : "Hook format is valid. A publish request confirms whether Cloudflare accepts it." },
    ] };
}
export function settingsInput(body: Record<string, unknown>) {
  return validate(() => ({ settings: validateSiteSettings(objectValue(body.settings, "Settings")), revision: revision(body.revision) }));
}

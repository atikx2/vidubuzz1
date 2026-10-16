import { publicAssetUrl } from "./media-assets";
import { type ModelBuildEnv } from "./model-build";
import { CATALOG_KINDS, INFORMATION_SLUGS, hasStarterCopy, plainText, validateSiteSettings, type PlatformSnapshot, type PublicCatalogEntry, type PublicInformationPage } from "./platform";

export const PLATFORM_FINGERPRINT_SQL = `SELECT
  (SELECT COUNT(*) || ':' || COALESCE(SUM(revision),0) || ':' || COALESCE(MAX(updated_at),'') FROM models) AS models,
  (SELECT COUNT(*) || ':' || COALESCE(SUM(revision),0) || ':' || COALESCE(MAX(updated_at),'') FROM catalog_entries) AS catalog,
  (SELECT COUNT(*) || ':' || COALESCE(SUM(revision),0) || ':' || COALESCE(MAX(updated_at),'') FROM site_pages) AS pages,
  (SELECT revision || ':' || updated_at FROM site_settings WHERE id = 1) AS settings,
  (SELECT COUNT(*) FROM content_slugs) AS slugs`;
export function platformReader(env: ModelBuildEnv, fetcher: typeof fetch = fetch) {
  if (!env.D1_DATABASE_ID || !env.D1_READ_TOKEN || !/^[a-f\d]{32}$/i.test(env.R2_ACCOUNT_ID ?? "") || !/^[a-z0-9-]{20,64}$/i.test(env.D1_DATABASE_ID)) throw new Error("Incomplete static workspace build settings. Set the existing D1 database ID, private read token and account ID.");
  return async <T>(sql: string, params: Array<string | number> = []): Promise<T[]> => {
    let response: Response;
    try {
      response = await fetcher(`https://api.cloudflare.com/client/v4/accounts/${env.R2_ACCOUNT_ID}/d1/database/${env.D1_DATABASE_ID}/query`, {
        method: "POST", headers: { authorization: `Bearer ${env.D1_READ_TOKEN}`, "content-type": "application/json" }, body: JSON.stringify({ sql, params }), signal: AbortSignal.timeout(25000),
      });
    } catch { throw new Error("Workspace snapshot request failed or timed out. Check private D1 build settings and migrations; private request details are not logged."); }
    if (!response.ok) throw new Error(`Static workspace query failed (${response.status}). Check migration 0004 and the D1 build settings. No private response body is logged.`);
    let data: { success?: boolean; result?: Array<{ success?: boolean; results?: T[] }> };
    try { data = await response.json(); } catch { throw new Error("D1 returned an invalid workspace snapshot. Refusing to publish partial data."); }
    if (!data.success || !data.result?.[0]?.success || !Array.isArray(data.result[0].results)) throw new Error("D1 returned an invalid workspace snapshot. Refusing to publish partial data.");
    return data.result[0].results;
  };
}
type ExportEntry = { id: string; kind: PublicCatalogEntry["kind"]; name: string; slug: string; description: string; seo_title: string;
  meta_description: string; image_alt: string; photo_asset_id: string | null; demo_image_path: string | null; source: PublicCatalogEntry["source"];
  revision: number; created_at: string; updated_at: string; object_key: string | null; content_type: string | null };
type ExportPage = { slug: PublicInformationPage["slug"]; title: string; description: string; body: string; noindex: number; revision: number; updated_at: string };
function checkedImage(row: ExportEntry, env: ModelBuildEnv) {
  if (row.photo_asset_id) {
    if (!row.object_key || !row.content_type?.startsWith("image/") || !/^media\/images\/(?:thumbnail|model-photo|channel-photo)\/\d{4}\/\d{2}\/[a-f0-9-]{36}\.(?:jpg|png|webp|avif)$/.test(row.object_key)) throw new Error("A public channel/category photo is missing or unverified. Correct it or save the entry as a draft.");
    try {
      const url = new URL(env.R2_PUBLIC_BASE_URL ?? "");
      if (url.protocol !== "https:" || url.username || url.password || url.port || url.search || url.hash || url.pathname !== "/" || url.hostname.endsWith(".r2.cloudflarestorage.com")) throw new Error();
      return publicAssetUrl(url.origin, row.object_key);
    } catch { throw new Error("Static workspace photos require a public HTTPS R2_PUBLIC_BASE_URL origin."); }
  }
  if (row.source === "demo" && /^\/media\/[a-z0-9.-]+$/.test(row.demo_image_path ?? "")) return row.demo_image_path!;
  if (row.kind === "category" && row.source === "admin") return "/media/category-placeholder.svg";
  throw new Error("A public managed channel requires a verified R2 photo.");
}
export async function buildPlatformSnapshot(env: ModelBuildEnv, fetcher: typeof fetch = fetch): Promise<PlatformSnapshot> {
  if (!env.D1_DATABASE_ID && !env.D1_READ_TOKEN) return { version: 1, source: "demo", builtAt: null, settings: null as unknown as PlatformSnapshot["settings"], settingsRevision: 0, entries: [], pages: [] };
  const query = platformReader(env, fetcher);
  const before = (await query<Record<string, unknown>>(PLATFORM_FINGERPRINT_SQL))[0];
  if (!before || !before.settings || !before.models || !before.catalog || !before.pages || !Number.isSafeInteger(before.slugs)) throw new Error("Workspace revision fingerprint is incomplete. Apply all of migration 0004.");
  const row = (await query<{ settings_json: string; revision: number }>("SELECT settings_json, revision FROM site_settings WHERE id = 1"))[0];
  if (!row || !Number.isSafeInteger(row.revision) || row.revision < 1) throw new Error("Workspace settings are missing or invalid.");
  const settings = validateSiteSettings(JSON.parse(row.settings_json));
  const reservations = await query<{ slug: string; entity_type: string; entity_id: string }>("SELECT slug, entity_type, entity_id FROM content_slugs WHERE entity_type IN ('system','channel')");
  const reserved = new Map(reservations.map((item) => [item.slug, item]));
  if (INFORMATION_SLUGS.some((slug) => reserved.get(slug)?.entity_type !== "system")) throw new Error("A required information-page URL is missing or conflicts with a model/channel. Resolve the reservation before publishing.");
  const entries: PublicCatalogEntry[] = [], seen = new Set<string>();
  let complete = false;
  for (let page = 0; page < 100; page++) {
    const rows = await query<ExportEntry>(`SELECT c.id, c.kind, c.name, c.slug, c.description, c.seo_title, c.meta_description, c.image_alt,
      c.photo_asset_id, c.demo_image_path, c.source, c.revision, c.created_at, c.updated_at, a.object_key, a.content_type
      FROM catalog_entries c LEFT JOIN media_assets a ON a.id = c.photo_asset_id AND a.status = 'ready'
      WHERE c.status = 'published' ORDER BY c.kind, c.created_at, c.id LIMIT ? OFFSET ?`, [200, page * 200]);
    for (const item of rows) {
      const key = `${item.kind}:${item.slug}`;
      if (!item.id || !CATALOG_KINDS.includes(item.kind) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.slug) || seen.has(key)
        || !["admin", "demo"].includes(item.source) || !Number.isSafeInteger(item.revision) || item.revision < 1
        || !Number.isFinite(Date.parse(item.created_at)) || !Number.isFinite(Date.parse(item.updated_at))) throw new Error("Invalid or duplicate published channel/category data.");
      if (item.kind === "channel" && (reserved.get(item.slug)?.entity_type !== "channel" || reserved.get(item.slug)?.entity_id !== item.id)) throw new Error("Channel slug ownership is inconsistent. Resolve its URL reservation before publishing.");
      seen.add(key);
      entries.push({ id: item.id, kind: item.kind, slug: item.slug, name: plainText(item.name, "Catalog name", 100, true),
        description: plainText(item.description, "Catalog description", 8000, true), seoTitle: plainText(item.seo_title, "Catalog SEO title", 100),
        metaDescription: plainText(item.meta_description, "Catalog meta description", 300), imageAlt: plainText(item.image_alt, "Catalog image description", 160),
        imageUrl: checkedImage(item, env), source: item.source, revision: item.revision, createdAt: item.created_at, updatedAt: item.updated_at });
    }
    if (rows.length < 200) { complete = true; break; }
  }
  if (!complete) throw new Error("Workspace exceeds the bounded export size. Shard the catalog before expanding it further.");
  const pageRows = await query<ExportPage>("SELECT slug, title, description, body, noindex, revision, updated_at FROM site_pages WHERE status = 'published' AND review_confirmed = 1 ORDER BY slug");
  const pages = pageRows.map((page): PublicInformationPage => {
    if (!INFORMATION_SLUGS.includes(page.slug) || !Number.isSafeInteger(page.revision) || page.revision < 1 || !Number.isFinite(Date.parse(page.updated_at)) || ![0, 1].includes(page.noindex)) throw new Error("Invalid public information page.");
    const body = plainText(page.body, "Information page content", 40000, true);
    if (hasStarterCopy(body)) throw new Error("Unreviewed policy starter text cannot be published.");
    if (page.slug === "contact" && !settings.publicEmail || page.slug === "content-removal" && !settings.removalEmail) throw new Error("A published contact/removal page is missing its monitored public email.");
    return { slug: page.slug, title: plainText(page.title, "Information page title", 140, true), description: plainText(page.description, "Information page description", 300, true),
      body, noindex: Boolean(page.noindex), revision: page.revision, updatedAt: page.updated_at };
  });
  const after = (await query<Record<string, unknown>>(PLATFORM_FINGERPRINT_SQL))[0];
  if (JSON.stringify(before) !== JSON.stringify(after)) throw new Error("Workspace changed while building its snapshot. Retry publishing without editing during the export.");
  return { version: 1, source: "d1", builtAt: new Date().toISOString(), settings, settingsRevision: row.revision, entries, pages };
}

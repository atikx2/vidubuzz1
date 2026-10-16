import { isCountryCode, type ModelSnapshot, type PublicModelRecord } from "./models";
import { publicAssetUrl } from "./media-assets";

export type ModelBuildEnv = { R2_ACCOUNT_ID?: string; D1_DATABASE_ID?: string; D1_READ_TOKEN?: string; R2_PUBLIC_BASE_URL?: string };
type ExportRow = { id: string; slug: string; name: string; country_code: string | null; age: number | null; description: string;
  seo_title: string; meta_description: string; image_alt: string; source: "admin" | "demo"; demo_image_path: string | null;
  photo_asset_id: string | null; object_key: string | null; content_type: string | null; revision: number; created_at: string; updated_at: string };
type Fingerprint = { total: number; revision_sum: number; latest: string | null };
const fingerprintSql = "SELECT COUNT(*) AS total, COALESCE(SUM(revision), 0) AS revision_sum, MAX(updated_at) AS latest FROM models";

function publicImageOrigin(value?: string) {
  if (!value) throw new Error("Model sync needs R2_PUBLIC_BASE_URL for managed photos.");
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash || url.pathname !== "/" || url.hostname.endsWith(".r2.cloudflarestorage.com")) throw new Error("Model sync needs a public HTTPS asset origin.");
  return url.origin;
}

export async function buildModelSnapshot(env: ModelBuildEnv, fetcher: typeof fetch = fetch): Promise<ModelSnapshot> {
  const configured = Boolean(env.D1_DATABASE_ID || env.D1_READ_TOKEN);
  if (!configured) return { version: 1, source: "demo", builtAt: null, models: [] };
  if (!env.D1_DATABASE_ID || !env.D1_READ_TOKEN || !env.R2_ACCOUNT_ID || !/^[a-f0-9]{32}$/i.test(env.R2_ACCOUNT_ID)
    || !/^[a-z0-9-]{20,64}$/i.test(env.D1_DATABASE_ID)) throw new Error("Incomplete model build settings: set D1_DATABASE_ID, D1_READ_TOKEN and the actual R2_ACCOUNT_ID. Refusing a silent demo fallback.");
  async function query<T>(sql: string, params: Array<string | number> = []): Promise<T[]> {
    const response = await fetcher(`https://api.cloudflare.com/client/v4/accounts/${env.R2_ACCOUNT_ID}/d1/database/${env.D1_DATABASE_ID}/query`, {
      method: "POST", headers: { authorization: `Bearer ${env.D1_READ_TOKEN}`, "content-type": "application/json" },
      body: JSON.stringify({ sql, params }), signal: AbortSignal.timeout(25_000),
    });
    if (!response.ok) throw new Error(`Model snapshot query failed (${response.status}). Check the D1 read token, database ID and migration 0003. Existing deployed pages are unchanged.`);
    const data = await response.json() as { success?: boolean; result?: Array<{ success?: boolean; results?: T[] }> };
    if (!data.success || !data.result?.[0]?.success || !Array.isArray(data.result[0].results)) throw new Error("D1 did not return a valid model snapshot. Refusing to publish partial content.");
    return data.result[0].results;
  }
  const before = (await query<Fingerprint>(fingerprintSql))[0];
  if (!before || !Number.isSafeInteger(before.total) || !Number.isSafeInteger(before.revision_sum)) throw new Error("D1 model catalog state could not be verified.");
  const models: PublicModelRecord[] = [];
  const slugs = new Set<string>();
  const pageSize = 200;
  let complete = false;
  for (let page = 0; page < 50; page++) {
    const rows = await query<ExportRow>(`SELECT m.id, m.slug, m.name, m.country_code, m.age, m.description, m.seo_title,
      m.meta_description, m.image_alt, m.source, m.demo_image_path, m.photo_asset_id, m.revision, m.created_at, m.updated_at,
      a.object_key, a.content_type FROM models m LEFT JOIN media_assets a ON a.id = m.photo_asset_id AND a.status = 'ready'
      WHERE m.status = 'published' AND m.adult_confirmed = 1 ORDER BY m.created_at ASC, m.id ASC LIMIT ? OFFSET ?`, [pageSize, page * pageSize]);
    for (const row of rows) {
      if (!row.id || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(row.slug) || slugs.has(row.slug) || !row.name?.trim()
        || !row.description?.trim() || !["admin", "demo"].includes(row.source) || !Number.isSafeInteger(row.revision) || row.revision < 1
        || !Number.isFinite(Date.parse(row.created_at)) || !Number.isFinite(Date.parse(row.updated_at))
        || (row.country_code !== null && !isCountryCode(row.country_code))
        || (row.age !== null && (!Number.isInteger(row.age) || row.age < 18 || row.age > 120))) throw new Error("Invalid/duplicate published model data. Correct the D1 record before publishing.");
      slugs.add(row.slug);
      let imageUrl: string;
      if (row.photo_asset_id) {
        if (!row.object_key || !row.content_type?.startsWith("image/") || !/^media\/images\/(?:thumbnail|model-photo|channel-photo)\/\d{4}\/\d{2}\/[a-f0-9-]{36}\.(?:jpg|png|webp|avif)$/.test(row.object_key)) throw new Error("A published model photo is missing or not a verified R2 image.");
        imageUrl = publicAssetUrl(publicImageOrigin(env.R2_PUBLIC_BASE_URL), row.object_key);
      } else if (row.source === "demo" && /^\/media\/[a-z0-9.-]+$/.test(row.demo_image_path ?? "")) imageUrl = row.demo_image_path!;
      else throw new Error("A published model needs a verified R2 thumbnail. Save it as a draft until the image is ready.");
      models.push({ id: row.id, name: row.name, slug: row.slug, countryCode: row.country_code, age: row.age,
        description: row.description, seoTitle: row.seo_title, metaDescription: row.meta_description, imageAlt: row.image_alt,
        imageUrl, source: row.source, createdAt: row.created_at, updatedAt: row.updated_at, revision: row.revision });
    }
    if (rows.length < pageSize) { complete = true; break; }
  }
  if (!complete) throw new Error("Model catalog exceeds this single-snapshot export limit. Split the catalog before publishing a larger site.");
  const after = (await query<Fingerprint>(fingerprintSql))[0];
  if (JSON.stringify(before) !== JSON.stringify(after)) throw new Error("Models changed while the snapshot was building. Retry publishing without editing the catalog during the snapshot step.");
  return { version: 1, source: "d1", builtAt: new Date().toISOString(), models };
}

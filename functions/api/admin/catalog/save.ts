import { ApiError, apiErrorResponse, jsonResponse, privateKeyHash, readJsonObject, requireAdmin, sameOriginRequest, type PagesContext } from "../../../_shared/admin-auth";
import { CATALOG_SELECT, catalogFromRow, validateCatalog, type CatalogRow, type PlatformEnv } from "../../../_shared/platform";
import { consumeRateLimit } from "../../../_shared/rate-limit";
export async function onRequestPost({ request, env }: PagesContext<PlatformEnv>) {
  if (!sameOriginRequest(request)) return jsonResponse({ error: "Invalid request origin." }, 403);
  try {
    const session = await requireAdmin(request, env);
    if (!session) return jsonResponse({ error: "Please sign in again." }, 401);
    await consumeRateLimit(env.DB!, await privateKeyHash(`catalog-save:${session.email}`, env.ADMIN_SESSION_SECRET!), 40, 600);
    const input = validateCatalog(await readJsonObject(request, 65536));
    if (input.photoAssetId) {
      const photo = await env.DB!.prepare("SELECT id FROM media_assets WHERE id = ? AND status = 'ready' AND uploader_email = ? AND content_type LIKE 'image/%'").bind(input.photoAssetId, session.email).first();
      if (!photo) throw new ApiError("Choose a verified image owned by this admin from the media library.", 400);
    }
    if (input.kind === "channel" && input.status === "published" && !input.photoAssetId) throw new ApiError("Choose a channel photo before marking it public. You can save a draft without one.", 400);
    const now = new Date().toISOString();
    let id = input.id;
    if (id) {
      const existing = await env.DB!.prepare("SELECT * FROM catalog_entries WHERE id = ? AND kind = ?").bind(id, input.kind).first<CatalogRow>();
      if (!existing) throw new ApiError("Catalog entry not found.", 404);
      if (existing.slug !== input.slug) throw new ApiError("Saved URLs are locked to prevent broken links. Slug changes need a separate redirect migration.", 400);
      if (existing.revision !== input.revision) throw new ApiError("This entry changed in another tab. Reload it before saving.", 409);
      const result = await env.DB!.prepare(`UPDATE catalog_entries SET name = ?, description = ?, seo_title = ?, meta_description = ?, image_alt = ?,
        photo_asset_id = ?, demo_image_path = NULL, status = ?, source = 'admin', revision = revision + 1, updated_at = ? WHERE id = ? AND revision = ?`)
        .bind(input.name, input.description, input.seoTitle, input.metaDescription, input.imageAlt, input.photoAssetId, input.status, now, id, input.revision!).run();
      if (result.meta?.changes !== 1) throw new ApiError("Concurrent edit detected. Reload this entry.", 409);
    } else {
      id = crypto.randomUUID();
      const statements = [env.DB!.prepare(`INSERT INTO catalog_entries (id, kind, slug, name, description, seo_title, meta_description, image_alt,
        photo_asset_id, status, source, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'admin', ?, ?, ?)`)
        .bind(id, input.kind, input.slug, input.name, input.description, input.seoTitle, input.metaDescription, input.imageAlt, input.photoAssetId, input.status, session.email, now, now)];
      if (input.kind === "channel") statements.push(env.DB!.prepare("INSERT INTO content_slugs (slug, entity_type, entity_id) VALUES (?, 'channel', ?)").bind(input.slug, id));
      try { await env.DB!.batch(statements); }
      catch (error) { if (/unique constraint|primary key/i.test(String(error))) throw new ApiError("This URL is already used or reserved. Choose another slug in More options.", 409); throw error; }
    }
    const row = await env.DB!.prepare(`${CATALOG_SELECT} WHERE c.id = ?`).bind(id).first<CatalogRow>();
    if (!row) throw new ApiError("Entry saved, but could not be reloaded. Refresh the list.", 503);
    return jsonResponse({ entry: catalogFromRow(row, env), requiresBuild: true }, input.id ? 200 : 201);
  } catch (error) { return apiErrorResponse(error, "Entry could not be saved. Check migration 0004 and the existing DB binding."); }
}

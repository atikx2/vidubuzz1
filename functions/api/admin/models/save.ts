import { apiErrorResponse, ApiError, jsonResponse, privateKeyHash, readJsonObject, requireAdmin, sameOriginRequest, type PagesContext } from "../../../_shared/admin-auth";
import { consumeRateLimit } from "../../../_shared/rate-limit";
import { MODEL_SELECT, modelFromRow, validateModel, type ModelEnv, type ModelRow } from "../../../_shared/models";

export async function onRequestPost({ request, env }: PagesContext<ModelEnv>) {
  if (!sameOriginRequest(request)) return jsonResponse({ error: "Invalid request origin." }, 403);
  try {
    const session = await requireAdmin(request, env);
    if (!session) return jsonResponse({ error: "Please sign in again." }, 401);
    await consumeRateLimit(env.DB!, await privateKeyHash(`model-save:${session.email}`, env.ADMIN_SESSION_SECRET!), 30, 10 * 60);
    const input = validateModel(await readJsonObject(request, 65_536));
    if (input.photoAssetId) {
      const photo = await env.DB!.prepare("SELECT id FROM media_assets WHERE id = ? AND status = 'ready' AND uploader_email = ? AND content_type LIKE 'image/%'")
        .bind(input.photoAssetId, session.email).first();
      if (!photo) throw new ApiError("Choose a verified image owned by this admin from the R2 library. Preview videos cannot be model photos.", 400);
    }
    if (input.status === "published" && !input.photoAssetId) throw new ApiError("Choose an R2 thumbnail before marking this model public for the next build.", 400);
    const now = new Date().toISOString();
    let id = input.id;
    if (id) {
      const existing = await env.DB!.prepare("SELECT * FROM models WHERE id = ?").bind(id).first<ModelRow>();
      if (!existing) throw new ApiError("Model not found.", 404);
      if (input.slug !== existing.slug) throw new ApiError("Saved model URLs are stable. Slug changes need a redirect migration and are not allowed here.", 400);
      if (existing.revision !== input.revision) throw new ApiError("This model changed in another tab. Close and reload it before saving.", 409);
      const result = await env.DB!.prepare(`UPDATE models SET name = ?, country_code = ?, age = ?, description = ?, seo_title = ?,
        meta_description = ?, image_alt = ?, photo_asset_id = ?, adult_confirmed = 1, status = ?, source = 'admin',
        demo_image_path = NULL, revision = revision + 1, updated_at = ? WHERE id = ? AND revision = ?`)
        .bind(input.name, input.countryCode, input.age, input.description, input.seoTitle, input.metaDescription,
          input.imageAlt, input.photoAssetId, input.status, now, id, input.revision!).run();
      if (result.meta?.changes !== 1) throw new ApiError("Concurrent edit detected. Reload this model.", 409);
    } else {
      id = crypto.randomUUID();
      try {
        await env.DB!.batch([
          env.DB!.prepare(`INSERT INTO models (id, slug, name, country_code, age, description, seo_title, meta_description,
            image_alt, photo_asset_id, adult_confirmed, status, source, created_by, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, 'admin', ?, ?, ?)`)
            .bind(id, input.slug, input.name, input.countryCode, input.age, input.description, input.seoTitle,
              input.metaDescription, input.imageAlt, input.photoAssetId, input.status, session.email, now, now),
          env.DB!.prepare("INSERT INTO content_slugs (slug, entity_type, entity_id) VALUES (?, 'model', ?)").bind(input.slug, id),
        ]);
      } catch (error) {
        if (/unique constraint|primary key/i.test(String(error))) throw new ApiError("This URL slug is already used or reserved by a model, channel or system page. Choose another slug.", 409);
        throw error;
      }
    }
    const row = await env.DB!.prepare(`${MODEL_SELECT} WHERE m.id = ?`).bind(id).first<ModelRow>();
    if (!row) throw new ApiError("Model was saved but could not be read. Refresh the list.", 503);
    return jsonResponse({ model: modelFromRow(row, env), requiresBuild: true,
      message: "Model saved in D1. Public static pages change only after a successful publish build." }, input.id ? 200 : 201);
  } catch (error) { return apiErrorResponse(error, "Model could not be saved. Check migrations 0002/0003 and the D1 binding."); }
}

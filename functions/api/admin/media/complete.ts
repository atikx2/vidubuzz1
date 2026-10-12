import {
  ApiError, apiErrorResponse, jsonResponse, privateKeyHash, readJsonObject, requireAdmin, sameOriginRequest, type PagesContext,
} from "../../../_shared/admin-auth";
import { consumeRateLimit } from "../../../_shared/rate-limit";
import { UUID_PATTERN, requireStorage, rowToAsset, signatureMatches, type MediaEnv, type MediaRow } from "../../../_shared/r2-media";

export async function onRequestPost({ request, env }: PagesContext<MediaEnv>) {
  if (!sameOriginRequest(request)) return jsonResponse({ error: "Invalid request origin." }, 403);
  try {
    const session = await requireAdmin(request, env);
    if (!session) return jsonResponse({ error: "Please sign in again." }, 401);
    const { bucket, publicBaseUrl } = requireStorage(env);
    await consumeRateLimit(env.DB!, await privateKeyHash(`media-complete:${session.email}`, env.ADMIN_SESSION_SECRET!), 60, 60);
    const body = await readJsonObject(request);
    if (typeof body.id !== "string" || !UUID_PATTERN.test(body.id)) throw new ApiError("Invalid upload identifier.", 400);
    const row = await env.DB!.prepare("SELECT * FROM media_assets WHERE id = ? AND uploader_email = ?")
      .bind(body.id, session.email).first<MediaRow>();
    if (!row) throw new ApiError("Upload intent not found.", 404);
    if (row.status === "ready") return jsonResponse({ asset: rowToAsset(row, publicBaseUrl) });
    if (row.status !== "pending") throw new ApiError("This upload was rejected. Choose a new file.", 409);
    if (Date.now() > new Date(row.upload_expires_at).getTime() + 30 * 60_000) throw new ApiError("Upload verification expired. Prepare a new upload.", 410);
    const object = await bucket.head(row.object_key);
    if (!object) throw new ApiError("File is not in R2 yet. Wait for the direct upload to finish, then retry verification.", 409);

    const metadataMatches = object.size === row.size_bytes && object.httpMetadata?.contentType === row.content_type
      && object.customMetadata?.["asset-id"] === row.id && object.customMetadata?.purpose === row.purpose;
    // Inspect only a tiny byte range; do not proxy, decode or transcode the uploaded file.
    const header = metadataMatches ? await bucket.get(row.object_key, { range: { offset: 0, length: 512 } }) : null;
    const valid = metadataMatches && header && signatureMatches(row.content_type, await header.arrayBuffer());
    if (!valid) {
      await env.DB!.prepare("UPDATE media_assets SET status = 'rejected', updated_at = ? WHERE id = ? AND status = 'pending'")
        .bind(new Date().toISOString(), row.id).run();
      await bucket.delete(row.object_key);
      throw new ApiError("R2 file did not match the signed size, media type or upload metadata. It was rejected.", 400);
    }
    await env.DB!.prepare("UPDATE media_assets SET status = 'ready', object_etag = ?, updated_at = ? WHERE id = ? AND status = 'pending'")
      .bind(object.etag, new Date().toISOString(), row.id).run();
    const saved = await env.DB!.prepare("SELECT * FROM media_assets WHERE id = ? AND uploader_email = ?")
      .bind(row.id, session.email).first<MediaRow>();
    if (!saved || saved.status !== "ready") throw new ApiError("Upload was not finalized. Retry verification.", 409);
    return jsonResponse({ asset: rowToAsset(saved, publicBaseUrl) });
  } catch (error) {
    return apiErrorResponse(error, "Could not verify the uploaded file. Check ASSETS_BUCKET, the R2 bucket name and the D1 media migration.");
  }
}

import {
  apiErrorResponse, jsonResponse, privateKeyHash, readJsonObject, requireAdmin, sameOriginRequest, type PagesContext,
} from "../../../_shared/admin-auth";
import { consumeRateLimit } from "../../../_shared/rate-limit";
import { newObjectKey, requireStorage, signUpload, validateIntent, type MediaEnv } from "../../../_shared/r2-media";

export async function onRequestPost({ request, env }: PagesContext<MediaEnv>) {
  if (!sameOriginRequest(request)) return jsonResponse({ error: "Invalid request origin." }, 403);
  try {
    const session = await requireAdmin(request, env);
    if (!session) return jsonResponse({ error: "Please sign in again." }, 401);
    requireStorage(env);
    await consumeRateLimit(env.DB!, await privateKeyHash(`media-upload:${session.email}`, env.ADMIN_SESSION_SECRET!), 20, 10 * 60);
    const intent = validateIntent(await readJsonObject(request));
    const id = crypto.randomUUID();
    const now = new Date();
    const key = newObjectKey(intent, id, now);
    const upload = await signUpload(env, id, key, intent, now);
    // Persist the intent before exposing the one-object, short-lived PUT URL.
    await env.DB!.prepare(`INSERT INTO media_assets (id, object_key, purpose, original_filename, content_type,
      size_bytes, width, height, duration_seconds, uploader_email, upload_expires_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(id, key, intent.purpose, intent.filename,
        intent.contentType, intent.size, intent.width, intent.height, intent.duration ?? null, session.email,
        upload.expiresAt, now.toISOString(), now.toISOString()).run();
    return jsonResponse(upload, 201);
  } catch (error) {
    return apiErrorResponse(error, "Could not prepare the R2 upload. Apply migration 0002_r2_media.sql and check storage settings.");
  }
}

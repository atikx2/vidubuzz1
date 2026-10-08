import { categoryDirectory, channelDirectory, performers, videos } from "../../../lib/demo-content";
import {
  ApiError, apiErrorResponse, jsonResponse, readJsonObject, sameOriginRequest, sha256,
  type AdminEnv, type PagesContext,
} from "../../_shared/admin-auth";
import { consumeRateLimit } from "../../_shared/rate-limit";

const uuidPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const publicPaths = new Set([
  "/", "/categories", "/channels", "/pornstars",
  ...videos.map((video) => `/video/${video.id}`),
  ...categoryDirectory.map((category) => `/categories/${category.slug}`),
  ...channelDirectory.map((channel) => `/${channel.slug}`),
  ...performers.map((performer) => `/${performer.slug}`),
]);

export async function onRequestPost({ request, env }: PagesContext<AdminEnv>) {
  if (!sameOriginRequest(request)) return jsonResponse({ error: "Invalid request origin." }, 403);
  if (!env.DB) return jsonResponse({ error: "Analytics database is not configured." }, 503);
  try {
    const event = await readJsonObject(request, 2048);
    const { type, visitorId, eventId, path, videoId } = event;
    if (typeof visitorId !== "string" || !uuidPattern.test(visitorId)
      || typeof eventId !== "string" || !uuidPattern.test(eventId)
      || typeof path !== "string" || path.length > 400 || !path.startsWith("/")) {
      throw new ApiError("Invalid analytics event.", 400);
    }
    const normalizedPath = path.replace(/\/+$/, "") || "/";
    if (!publicPaths.has(normalizedPath)) throw new ApiError("Unknown or private page.", 400);
    if (type !== "page_view" && type !== "heartbeat" && type !== "video_view") {
      throw new ApiError("Unsupported analytics event.", 400);
    }
    if (type === "video_view" && (typeof videoId !== "number" || !Number.isInteger(videoId)
      || !videos.some((video) => video.id === videoId) || normalizedPath !== `/video/${videoId}`)) {
      throw new ApiError("Invalid video event.", 400);
    }

    const visitorHash = await sha256(visitorId);
    await consumeRateLimit(env.DB, `analytics:${visitorHash}`, 30, 60);
    const now = new Date();
    const statements = [env.DB.prepare(`INSERT INTO analytics_visitors (visitor_hash, last_seen) VALUES (?, ?)
      ON CONFLICT(visitor_hash) DO UPDATE SET last_seen = excluded.last_seen`).bind(visitorHash, now.toISOString())];
    if (type === "page_view") {
      statements.push(env.DB.prepare(`INSERT OR IGNORE INTO analytics_events
        (dedupe_key, event_type, visitor_hash, page_path, created_at) VALUES (?, 'page_view', ?, ?, ?)`)
        .bind(`page:${visitorHash}:${eventId}`, visitorHash, normalizedPath, now.toISOString()));
    } else if (type === "video_view") {
      // One atomic statement deduplicates plays for the same session/video within 30 minutes.
      statements.push(env.DB.prepare(`INSERT OR IGNORE INTO analytics_events
        (dedupe_key, event_type, visitor_hash, page_path, video_id, created_at)
        SELECT ?, 'video_view', ?, ?, ?, ? WHERE NOT EXISTS
          (SELECT 1 FROM analytics_events WHERE event_type = 'video_view' AND visitor_hash = ? AND video_id = ? AND created_at >= ?)`)
        .bind(`video:${visitorHash}:${eventId}`, visitorHash, normalizedPath, Number(videoId), now.toISOString(),
          visitorHash, Number(videoId), new Date(now.getTime() - 30 * 60_000).toISOString()));
    }
    await env.DB.batch(statements);
    return new Response(null, { status: 204, headers: { "cache-control": "no-store" } });
  } catch (error) {
    return apiErrorResponse(error, "Could not record analytics event. Check the D1 migration.");
  }
}

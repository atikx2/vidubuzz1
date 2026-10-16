import { isMediaPurpose } from "../../../../lib/media-assets";
import { ApiError, apiErrorResponse, jsonResponse, requireAdmin, type PagesContext } from "../../../_shared/admin-auth";
import { requireStorage, rowToAsset, type MediaEnv, type MediaRow } from "../../../_shared/r2-media";

type CountRow = { count: number };

export async function onRequestGet({ request, env }: PagesContext<MediaEnv>) {
  try {
    const session = await requireAdmin(request, env);
    if (!session) return jsonResponse({ error: "Please sign in again." }, 401);
    const { publicBaseUrl } = requireStorage(env);
    const search = new URL(request.url).searchParams;
    const purpose = search.get("purpose");
    if (purpose && !isMediaPurpose(purpose)) throw new ApiError("Invalid media filter.", 400);
    const page = Number(search.get("page") ?? 1);
    const kind = search.get("kind");
    if (kind && kind !== "image" && kind !== "preview") throw new ApiError("Invalid media kind.", 400);
    if (!Number.isSafeInteger(page) || page < 1 || page > 10000) throw new ApiError("Invalid media page.", 400);
    const pageSize = 24;
    const filter = (purpose ? " AND purpose = ?" : "") + (kind === "image" ? " AND content_type LIKE 'image/%'" : kind === "preview" ? " AND content_type LIKE 'video/%'" : "");
    const values: Array<string | number> = purpose ? [session.email, purpose] : [session.email];
    const [rows, count] = await Promise.all([
      env.DB!.prepare(`SELECT * FROM media_assets WHERE uploader_email = ? AND status = 'ready'${filter}
        ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`).bind(...values, pageSize, (page - 1) * pageSize).all<MediaRow>(),
      env.DB!.prepare(`SELECT COUNT(*) AS count FROM media_assets WHERE uploader_email = ? AND status = 'ready'${filter}`)
        .bind(...values).first<CountRow>(),
    ]);
    return jsonResponse({ assets: (rows.results ?? []).map((row) => rowToAsset(row, publicBaseUrl)), page,
      total: Number(count?.count ?? 0), totalPages: Math.max(1, Math.ceil(Number(count?.count ?? 0) / pageSize)) });
  } catch (error) {
    return apiErrorResponse(error, "Could not load the media library. Apply migration 0002_r2_media.sql and check R2 settings.");
  }
}

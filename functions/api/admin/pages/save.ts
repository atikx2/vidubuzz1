import { ApiError, apiErrorResponse, jsonResponse, privateKeyHash, readJsonObject, requireAdmin, sameOriginRequest, type PagesContext } from "../../../_shared/admin-auth";
import { pageFromRow, readSettings, validatePage, type PageRow, type PlatformEnv } from "../../../_shared/platform";
import { consumeRateLimit } from "../../../_shared/rate-limit";
export async function onRequestPost({ request, env }: PagesContext<PlatformEnv>) {
  if (!sameOriginRequest(request)) return jsonResponse({ error: "Invalid request origin." }, 403);
  try {
    const session = await requireAdmin(request, env);
    if (!session) return jsonResponse({ error: "Please sign in again." }, 401);
    await consumeRateLimit(env.DB!, await privateKeyHash(`page-save:${session.email}`, env.ADMIN_SESSION_SECRET!), 30, 600);
    const input = validatePage(await readJsonObject(request, 262144));
    if (input.status === "published") {
      const { settings } = await readSettings(env.DB!);
      if (input.slug === "contact" && !settings.publicEmail) throw new ApiError("Add a monitored public contact email in Settings before publishing the Contact page.", 400);
      if (input.slug === "content-removal" && !settings.removalEmail) throw new ApiError("Add a monitored removal email in Settings before publishing the Content removal page.", 400);
      const reservation = await env.DB!.prepare("SELECT entity_type FROM content_slugs WHERE slug = ?").bind(input.slug).first<{ entity_type: string }>();
      if (reservation?.entity_type !== "system") throw new ApiError("This page URL conflicts with an existing model/channel. Resolve the reservation before publishing.", 409);
    }
    const result = await env.DB!.prepare(`UPDATE site_pages SET title = ?, description = ?, body = ?, status = ?, review_confirmed = ?, noindex = ?,
      revision = revision + 1, updated_at = ? WHERE slug = ? AND revision = ?`)
      .bind(input.title, input.description, input.body, input.status, Number(input.reviewConfirmed), Number(input.noindex), new Date().toISOString(), input.slug, input.revision).run();
    if (result.meta?.changes !== 1) throw new ApiError("This page changed in another tab or is missing. Reload before saving.", 409);
    const row = await env.DB!.prepare("SELECT * FROM site_pages WHERE slug = ?").bind(input.slug).first<PageRow>();
    if (!row) throw new ApiError("Page saved, but could not be reloaded.", 503);
    return jsonResponse({ page: pageFromRow(row), requiresBuild: true });
  } catch (error) { return apiErrorResponse(error, "Page could not be saved. Check migration 0004 and the existing DB binding."); }
}

import { apiErrorResponse, jsonResponse, requireAdmin, type PagesContext } from "../../../_shared/admin-auth";
import { pageFromRow, type PageRow, type PlatformEnv } from "../../../_shared/platform";
export async function onRequestGet({ request, env }: PagesContext<PlatformEnv>) {
  try {
    if (!(await requireAdmin(request, env))) return jsonResponse({ error: "Please sign in again." }, 401);
    const result = await env.DB!.prepare("SELECT * FROM site_pages ORDER BY slug").all<PageRow>();
    return jsonResponse({ pages: (result.results ?? []).map(pageFromRow) });
  } catch (error) { return apiErrorResponse(error, "Pages could not be loaded. Apply migration 0004 to the existing database."); }
}

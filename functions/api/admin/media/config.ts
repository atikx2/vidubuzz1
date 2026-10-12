import { apiErrorResponse, jsonResponse, requireAdmin, type PagesContext } from "../../../_shared/admin-auth";
import { mediaConfig, type MediaEnv } from "../../../_shared/r2-media";

export async function onRequestGet({ request, env }: PagesContext<MediaEnv>) {
  try {
    const session = await requireAdmin(request, env);
    if (!session) return jsonResponse({ error: "Please sign in again." }, 401);
    return jsonResponse(await mediaConfig(env));
  } catch (error) {
    return apiErrorResponse(error, "Media setup could not be checked. Check the D1 binding.");
  }
}

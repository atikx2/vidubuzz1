import { ApiError, apiErrorResponse, jsonResponse, privateKeyHash, readJsonObject, requireAdmin, sameOriginRequest, type PagesContext } from "../../_shared/admin-auth";
import { readSettings, settingsInput, type PlatformEnv } from "../../_shared/platform";
import { consumeRateLimit } from "../../_shared/rate-limit";
export async function onRequestGet({ request, env }: PagesContext<PlatformEnv>) {
  try {
    if (!(await requireAdmin(request, env))) return jsonResponse({ error: "Please sign in again." }, 401);
    return jsonResponse(await readSettings(env.DB!));
  } catch (error) { return apiErrorResponse(error, "Settings could not be loaded. Apply migration 0004 to the existing database."); }
}
export async function onRequestPost({ request, env }: PagesContext<PlatformEnv>) {
  if (!sameOriginRequest(request)) return jsonResponse({ error: "Invalid request origin." }, 403);
  try {
    const session = await requireAdmin(request, env);
    if (!session) return jsonResponse({ error: "Please sign in again." }, 401);
    await consumeRateLimit(env.DB!, await privateKeyHash(`settings-save:${session.email}`, env.ADMIN_SESSION_SECRET!), 30, 600);
    const input = settingsInput(await readJsonObject(request, 16384));
    const result = await env.DB!.prepare("UPDATE site_settings SET settings_json = ?, revision = revision + 1, updated_at = ? WHERE id = 1 AND revision = ?")
      .bind(JSON.stringify(input.settings), new Date().toISOString(), input.revision).run();
    if (result.meta?.changes !== 1) throw new ApiError("Settings changed in another tab. Reload before saving; your local changes have not overwritten them.", 409);
    return jsonResponse({ ...await readSettings(env.DB!), requiresBuild: true, message: "Settings saved. Publish a successful static build to update the public website." });
  } catch (error) { return apiErrorResponse(error, "Settings could not be saved. Apply migration 0004 to the existing database."); }
}

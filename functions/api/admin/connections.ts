import { apiErrorResponse, jsonResponse, requireAdmin, type PagesContext } from "../../_shared/admin-auth";
import { platformConfig, type PlatformEnv } from "../../_shared/platform";
import snapshot from "../../../.generated/platform-meta.json";
export async function onRequestGet({ request, env }: PagesContext<PlatformEnv>) {
  try {
    if (!(await requireAdmin(request, env))) return jsonResponse({ error: "Please sign in again." }, 401);
    return jsonResponse(await platformConfig(env, snapshot as { source: "demo" | "d1"; builtAt: string | null }));
  } catch (error) { return apiErrorResponse(error, "Connection status could not be loaded. Check the existing D1 binding."); }
}

import { ApiError, apiErrorResponse, jsonResponse, privateKeyHash, requireAdmin, sameOriginRequest, type PagesContext } from "../../_shared/admin-auth";
import { platformConfig, type PlatformEnv } from "../../_shared/platform";
import { consumeRateLimit } from "../../_shared/rate-limit";
import snapshot from "../../../.generated/platform-meta.json";
export async function onRequestPost({ request, env }: PagesContext<PlatformEnv>) {
  if (!sameOriginRequest(request)) return jsonResponse({ error: "Invalid request origin." }, 403);
  try {
    const session = await requireAdmin(request, env);
    if (!session) return jsonResponse({ error: "Please sign in again." }, 401);
    const config = await platformConfig(env, snapshot as { source: "demo" | "d1"; builtAt: string | null });
    if (!config.publishingConfigured) throw new ApiError("Static publishing is not configured. Complete migration 0004 and the private D1 build-read/Pages deploy-hook settings for this branch.", 503);
    // All catalog/settings/page publish buttons share one quota, including the legacy Models URL.
    await consumeRateLimit(env.DB!, await privateKeyHash(`site-publish:${session.email}`, env.ADMIN_SESSION_SECRET!), 3, 900);
    const response = await fetch(env.PAGES_DEPLOY_HOOK!, { method: "POST", redirect: "error", signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new ApiError("Cloudflare did not accept the publish request. Check the branch-specific private hook.", 502);
    const result = await response.json() as { success?: boolean };
    if (!result.success) throw new ApiError("Cloudflare could not queue the static build.", 502);
    return jsonResponse({ queued: true, message: "Static build queued, not live yet. Public models, channels, categories, settings and reviewed pages update only after Cloudflare finishes this build successfully." }, 202);
  } catch (error) { return apiErrorResponse(error, "Publish failed. Your last successful public deployment is unchanged."); }
}

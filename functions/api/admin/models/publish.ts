import { apiErrorResponse, ApiError, jsonResponse, privateKeyHash, requireAdmin, sameOriginRequest, type PagesContext } from "../../../_shared/admin-auth";
import { consumeRateLimit } from "../../../_shared/rate-limit";
import { modelConfig, type ModelEnv } from "../../../_shared/models";
import rawSnapshot from "../../../../.generated/model-meta.json";
import type { ModelSnapshot } from "../../../../lib/models";
const modelSnapshot = rawSnapshot as Pick<ModelSnapshot, "source" | "builtAt">;

export async function onRequestPost({ request, env }: PagesContext<ModelEnv>) {
  if (!sameOriginRequest(request)) return jsonResponse({ error: "Invalid request origin." }, 403);
  try {
    const session = await requireAdmin(request, env);
    if (!session) return jsonResponse({ error: "Please sign in again." }, 401);
    const config = await modelConfig(env, modelSnapshot);
    if (!config.publishingConfigured) throw new ApiError("Static publishing is not configured. Set the D1 build-read settings and a Pages deploy hook for this branch/environment.", 503);
    await consumeRateLimit(env.DB!, await privateKeyHash(`model-publish:${session.email}`, env.ADMIN_SESSION_SECRET!), 3, 15 * 60);
    const response = await fetch(env.PAGES_DEPLOY_HOOK!, { method: "POST", redirect: "error", signal: AbortSignal.timeout(15_000) });
    if (!response.ok) throw new ApiError("Cloudflare did not accept the publish request. Check the private deploy hook and project build settings.", 502);
    const result = await response.json() as { success?: boolean };
    if (!result.success) throw new ApiError("Cloudflare could not queue the static build.", 502);
    return jsonResponse({ queued: true, message: "Static build queued. Models are not live until Cloudflare completes the deployment successfully. Draft and archived profiles are excluded." }, 202);
  } catch (error) { return apiErrorResponse(error, "Publish request failed. Existing public pages remain on their last successful deployment."); }
}

import { apiErrorResponse, jsonResponse, requireAdmin, type PagesContext } from "../../../_shared/admin-auth";
import { modelConfig, type ModelEnv } from "../../../_shared/models";
import rawSnapshot from "../../../../.generated/model-meta.json";
import type { ModelSnapshot } from "../../../../lib/models";
const modelSnapshot = rawSnapshot as Pick<ModelSnapshot, "source" | "builtAt">;

export async function onRequestGet({ request, env }: PagesContext<ModelEnv>) {
  try {
    if (!(await requireAdmin(request, env))) return jsonResponse({ error: "Please sign in again." }, 401);
    const config = await modelConfig(env, modelSnapshot);
    let workspaceReady = false;
    try {
      const row = await env.DB!.prepare(`SELECT (SELECT COUNT(*) FROM site_pages) AS pages,
        (SELECT COUNT(*) FROM catalog_entries) AS entries,
        (SELECT COUNT(*) FROM content_slugs WHERE entity_type = 'system' AND slug IN ('about','contact','privacy','terms','content-removal')) AS reserved
        FROM site_settings WHERE id = 1`).first<{ pages: number; entries: number; reserved: number }>();
      workspaceReady = Boolean(row && row.pages === 5 && row.reserved === 5);
    } catch { /* Models still work before the optional expanded workspace migration. */ }
    return jsonResponse({ ...config, publishingConfigured: config.publishingConfigured && workspaceReady,
      publishMissing: [...(!workspaceReady ? ["migrations/0004_workspace.sql"] : []), ...config.publishMissing] });
  } catch (error) { return apiErrorResponse(error, "Model configuration could not be loaded. Check D1."); }
}

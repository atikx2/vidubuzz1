import { apiErrorResponse, jsonResponse, requireAdmin, type PagesContext } from "../../../_shared/admin-auth";
import { modelConfig, type ModelEnv } from "../../../_shared/models";
import rawSnapshot from "../../../../.generated/model-meta.json";
import type { ModelSnapshot } from "../../../../lib/models";
const modelSnapshot = rawSnapshot as Pick<ModelSnapshot, "source" | "builtAt">;

export async function onRequestGet({ request, env }: PagesContext<ModelEnv>) {
  try {
    if (!(await requireAdmin(request, env))) return jsonResponse({ error: "Please sign in again." }, 401);
    return jsonResponse(await modelConfig(env, modelSnapshot));
  } catch (error) { return apiErrorResponse(error, "Model configuration could not be loaded. Check D1."); }
}

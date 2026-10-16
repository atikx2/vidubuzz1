import { apiErrorResponse, ApiError, jsonResponse, requireAdmin, type PagesContext } from "../../../_shared/admin-auth";
import { MODEL_SELECT, modelFromRow, type ModelEnv, type ModelRow } from "../../../_shared/models";
import { MODEL_STATUSES, isCountryCode } from "../../../../lib/models";

type Stats = { total: number; published: number; drafts: number; archived: number };
export async function onRequestGet({ request, env }: PagesContext<ModelEnv>) {
  try {
    if (!(await requireAdmin(request, env))) return jsonResponse({ error: "Please sign in again." }, 401);
    const query = new URL(request.url).searchParams;
    const page = Number(query.get("page") ?? 1);
    const search = (query.get("q") ?? "").trim();
    const status = query.get("status") || "";
    const country = query.get("country") || "";
    const sort = query.get("sort") || "recent";
    if (!Number.isSafeInteger(page) || page < 1 || page > 10000 || search.length > 100
      || (status && !MODEL_STATUSES.includes(status as typeof MODEL_STATUSES[number])) || (country && !isCountryCode(country))
      || !["recent", "name"].includes(sort)) throw new ApiError("Invalid model list filters.", 400);
    const conditions: string[] = [];
    const values: Array<string | number> = [];
    if (search) { conditions.push("(m.name LIKE ? ESCAPE '\\' OR m.slug LIKE ? ESCAPE '\\')"); const pattern = `%${search.replace(/[\\%_]/g, "\\$&")}%`; values.push(pattern, pattern); }
    if (status) { conditions.push("m.status = ?"); values.push(status); }
    if (country) { conditions.push("m.country_code = ?"); values.push(country); }
    const where = conditions.length ? ` WHERE ${conditions.join(" AND ")}` : "";
    const pageSize = 12;
    const order = sort === "name" ? "m.name COLLATE NOCASE ASC, m.id ASC" : "m.updated_at DESC, m.id DESC";
    const [rows, count, stats] = await Promise.all([
      env.DB!.prepare(`${MODEL_SELECT}${where} ORDER BY ${order} LIMIT ? OFFSET ?`).bind(...values, pageSize, (page - 1) * pageSize).all<ModelRow>(),
      env.DB!.prepare(`SELECT COUNT(*) AS count FROM models m${where}`).bind(...values).first<{ count: number }>(),
      env.DB!.prepare(`SELECT COUNT(*) AS total, COALESCE(SUM(status = 'published'), 0) AS published,
        COALESCE(SUM(status = 'draft'), 0) AS drafts, COALESCE(SUM(status = 'archived'), 0) AS archived FROM models`).first<Stats>(),
    ]);
    const total = Number(count?.count ?? 0);
    return jsonResponse({ models: (rows.results ?? []).map((row) => modelFromRow(row, env)), page, total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)), stats: stats ?? { total: 0, published: 0, drafts: 0, archived: 0 } });
  } catch (error) { return apiErrorResponse(error, "Models could not be loaded. Apply migrations/0003_models.sql to the same D1 database."); }
}

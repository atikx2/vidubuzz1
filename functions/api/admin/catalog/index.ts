import { ApiError, apiErrorResponse, jsonResponse, requireAdmin, type PagesContext } from "../../../_shared/admin-auth";
import { CATALOG_SELECT, catalogFromRow, type CatalogRow, type PlatformEnv } from "../../../_shared/platform";
import { CATALOG_KINDS, type CatalogKind } from "../../../../lib/platform";
import { MODEL_STATUSES } from "../../../../lib/models";
export async function onRequestGet({ request, env }: PagesContext<PlatformEnv>) {
  try {
    if (!(await requireAdmin(request, env))) return jsonResponse({ error: "Please sign in again." }, 401);
    const params = new URL(request.url).searchParams;
    const kind = params.get("kind") as CatalogKind, page = Number(params.get("page") ?? 1), search = (params.get("q") ?? "").trim();
    const status = params.get("status") || "", sort = params.get("sort") || "recent";
    if (!CATALOG_KINDS.includes(kind) || !Number.isSafeInteger(page) || page < 1 || page > 10000 || search.length > 100
      || (status && !MODEL_STATUSES.includes(status as typeof MODEL_STATUSES[number])) || !["recent", "name"].includes(sort)) throw new ApiError("Invalid catalog filters.", 400);
    const conditions = ["c.kind = ?"], values: Array<string | number> = [kind];
    if (search) { conditions.push("(c.name LIKE ? ESCAPE '\\' OR c.slug LIKE ? ESCAPE '\\')"); const pattern = `%${search.replace(/[\\%_]/g, "\\$&")}%`; values.push(pattern, pattern); }
    if (status) { conditions.push("c.status = ?"); values.push(status); }
    const where = ` WHERE ${conditions.join(" AND ")}`;
    const [rows, count, stats] = await Promise.all([
      env.DB!.prepare(`${CATALOG_SELECT}${where} ORDER BY ${sort === "name" ? "c.name COLLATE NOCASE, c.id" : "c.updated_at DESC, c.id DESC"} LIMIT ? OFFSET ?`).bind(...values, 12, (page - 1) * 12).all<CatalogRow>(),
      env.DB!.prepare(`SELECT COUNT(*) AS count FROM catalog_entries c${where}`).bind(...values).first<{ count: number }>(),
      env.DB!.prepare(`SELECT COUNT(*) AS total, COALESCE(SUM(status = 'draft'),0) AS drafts, COALESCE(SUM(status = 'published'),0) AS published,
        COALESCE(SUM(status = 'archived'),0) AS archived FROM catalog_entries WHERE kind = ?`).bind(kind).first(),
    ]);
    const total = Number(count?.count ?? 0);
    return jsonResponse({ entries: (rows.results ?? []).map((row) => catalogFromRow(row, env)), page, total, totalPages: Math.max(1, Math.ceil(total / 12)), stats });
  } catch (error) { return apiErrorResponse(error, "Catalog could not be loaded. Apply migrations/0004_workspace.sql to the existing database."); }
}

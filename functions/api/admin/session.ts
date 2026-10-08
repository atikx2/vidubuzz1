import { apiErrorResponse, jsonResponse, requireAdmin, type AdminEnv, type PagesContext } from "../../_shared/admin-auth";

export async function onRequestGet({ request, env }: PagesContext<AdminEnv>) {
  try {
    const session = await requireAdmin(request, env);
    if (!session) return jsonResponse({ authenticated: false }, 401);
    return jsonResponse({ authenticated: true, email: session.email, mustChangePassword: session.mustChangePassword });
  } catch (error) {
    return apiErrorResponse(error, "Admin database unavailable. Check the D1 migration and binding.");
  }
}

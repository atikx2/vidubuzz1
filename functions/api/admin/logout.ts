import { apiErrorResponse, clearedSessionCookie, jsonResponse, requireAdmin, sameOriginRequest, type AdminEnv, type PagesContext } from "../../_shared/admin-auth";

export async function onRequestPost({ request, env }: PagesContext<AdminEnv>) {
  if (!sameOriginRequest(request)) return jsonResponse({ error: "Invalid request origin." }, 403);
  try {
    const session = await requireAdmin(request, env);
    if (session) await env.DB!.prepare("DELETE FROM admin_sessions WHERE id_hash = ?").bind(session.sessionHash).run();
    return jsonResponse({ loggedOut: true }, 200, { "set-cookie": clearedSessionCookie() });
  } catch (error) {
    return apiErrorResponse(error, "Sign-out failed. Please try again.");
  }
}

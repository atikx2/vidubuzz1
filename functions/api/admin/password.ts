import {
  apiErrorResponse,
  jsonResponse,
  makePasswordHash,
  randomSalt,
  readJsonObject,
  requireAdmin,
  sameOriginRequest,
  sessionCookie,
  verifyPassword,
  type AdminEnv,
  type AdminRow,
  type PagesContext,
} from "../../_shared/admin-auth";
import { limitAdminRequest } from "../../_shared/rate-limit";

export async function onRequestPost({ request, env }: PagesContext<AdminEnv>) {
  if (!sameOriginRequest(request)) return jsonResponse({ error: "Invalid request origin." }, 403);
  try {
    const session = await requireAdmin(request, env);
    if (!session) return jsonResponse({ error: "Please sign in again." }, 401);
    await limitAdminRequest(request, env, "password");
    const body = await readJsonObject(request);
    if (typeof body.currentPassword !== "string" || typeof body.newPassword !== "string") {
      return jsonResponse({ error: "Current and new passwords are required." }, 400);
    }
    const { currentPassword, newPassword } = body;
    if (!currentPassword || currentPassword.length > 256 || newPassword.length < 12 || newPassword.length > 256) {
      return jsonResponse({ error: "New password must contain 12–256 characters." }, 400);
    }
    if (newPassword === currentPassword) {
      return jsonResponse({ error: "Choose a different password." }, 400);
    }

    const account = await env.DB!.prepare("SELECT email, password_salt, password_hash, session_version, must_change_password FROM admin_users WHERE email = ?")
      .bind(session.email).first<AdminRow>();
    if (!account || account.session_version !== session.sessionVersion) return jsonResponse({ error: "Please sign in again." }, 401);
    if (!(await verifyPassword(currentPassword, account.password_salt, account.password_hash, env.ADMIN_PASSWORD_PEPPER!))) {
      return jsonResponse({ error: "Current password is incorrect." }, 400);
    }

    const salt = randomSalt();
    const hash = await makePasswordHash(newPassword, salt, env.ADMIN_PASSWORD_PEPPER!);
    const nextVersion = account.session_version + 1;
    const updated = await env.DB!.prepare(`UPDATE admin_users SET password_salt = ?, password_hash = ?, session_version = ?,
      must_change_password = 0, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE email = ? AND session_version = ?`)
      .bind(salt, hash, nextVersion, account.email, account.session_version).run();
    if (updated.meta?.changes !== 1) return jsonResponse({ error: "Account changed in another session. Sign in again." }, 409);

    // Version checking invalidates every old session immediately, including other devices.
    await env.DB!.prepare("DELETE FROM admin_sessions WHERE email = ? AND session_version < ?").bind(account.email, nextVersion).run();
    return jsonResponse({ changed: true }, 200, { "set-cookie": await sessionCookie(account.email, nextVersion, env) });
  } catch (error) {
    return apiErrorResponse(error, "Password could not be updated. Check the D1 binding.");
  }
}

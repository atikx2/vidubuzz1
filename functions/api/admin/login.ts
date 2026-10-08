import {
  adminEmail,
  apiErrorResponse,
  assertAdminConfig,
  jsonResponse,
  makePasswordHash,
  randomSalt,
  readJsonObject,
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
    assertAdminConfig(env);
    await limitAdminRequest(request, env, "login");
    const body = await readJsonObject(request);
    if (typeof body.email !== "string" || typeof body.password !== "string") {
      return jsonResponse({ error: "Email and password are required." }, 400);
    }
    const email = body.email.trim().toLowerCase();
    const password = body.password;
    const expectedEmail = adminEmail(env);
    if (email.length > 254 || !password || password.length > 256 || email !== expectedEmail) {
      return jsonResponse({ error: "Email or password is incorrect." }, 401);
    }

    let account = await env.DB!.prepare("SELECT email, password_salt, password_hash, session_version, must_change_password FROM admin_users WHERE email = ?")
      .bind(expectedEmail).first<AdminRow>();

    if (!account) {
      const initialPassword = env.ADMIN_INITIAL_PASSWORD;
      if (!initialPassword || initialPassword.length < 8 || initialPassword.length > 256) {
        return jsonResponse({ error: "Admin is not initialized. Set the initial password secret first." }, 503);
      }
      const salt = randomSalt();
      const hash = await makePasswordHash(initialPassword, salt, env.ADMIN_PASSWORD_PEPPER!);
      if (!(await verifyPassword(password, salt, hash, env.ADMIN_PASSWORD_PEPPER!))) {
        return jsonResponse({ error: "Email or password is incorrect." }, 401);
      }
      // Bootstrap only when no account exists; changing the secret cannot reset an existing password.
      await env.DB!.prepare("INSERT OR IGNORE INTO admin_users (email, password_salt, password_hash) VALUES (?, ?, ?)")
        .bind(expectedEmail, salt, hash).run();
      account = await env.DB!.prepare("SELECT email, password_salt, password_hash, session_version, must_change_password FROM admin_users WHERE email = ?")
        .bind(expectedEmail).first<AdminRow>();
    }

    if (!account || !(await verifyPassword(password, account.password_salt, account.password_hash, env.ADMIN_PASSWORD_PEPPER!))) {
      return jsonResponse({ error: "Email or password is incorrect." }, 401);
    }

    return jsonResponse(
      { authenticated: true, email: account.email, mustChangePassword: Boolean(account.must_change_password) },
      200,
      { "set-cookie": await sessionCookie(account.email, account.session_version, env) },
    );
  } catch (error) {
    return apiErrorResponse(error, "Could not access the admin database. Check the D1 migration and binding.");
  }
}

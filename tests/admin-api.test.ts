import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { privateKeyHash, type AdminEnv, type D1Database, type D1PreparedStatement, type D1Result } from "../functions/_shared/admin-auth";
import { onRequestPost as login } from "../functions/api/admin/login";
import { onRequestPost as logout } from "../functions/api/admin/logout";
import { onRequestPost as password } from "../functions/api/admin/password";
import { onRequestGet as session } from "../functions/api/admin/session";
import { onRequestGet as metrics } from "../functions/api/admin/metrics";
import { onRequestPost as track } from "../functions/api/analytics/track";
import { categoryDirectory, channelDirectory, performers, videos } from "../lib/demo-content";

// Test-only fixtures. No production/initial user password is present here.
const initialPassword = "FixtureInitial@872x";
const nextPassword = "FixtureReplacement@19z";
const email = "atikhasan315377@gmail.com";
const origin = "https://vidubuzz.test";

class Prepared implements D1PreparedStatement {
  constructor(private db: DatabaseSync, private sql: string, private values: Array<string | number | null> = []) {}
  bind(...values: Array<string | number | null>) { return new Prepared(this.db, this.sql, values); }
  async first<T>() { return (this.db.prepare(this.sql).get(...this.values) ?? null) as T | null; }
  async all<T>() { return { success: true, results: this.db.prepare(this.sql).all(...this.values) as T[] }; }
  async run() { const result = this.db.prepare(this.sql).run(...this.values); return { success: true, meta: { changes: Number(result.changes) } }; }
}

class LocalD1 implements D1Database {
  sqlite = new DatabaseSync(":memory:");
  constructor() { this.sqlite.exec(readFileSync(new URL("../migrations/0001_admin_analytics.sql", import.meta.url), "utf8")); }
  prepare(sql: string) { return new Prepared(this.sqlite, sql); }
  async batch<T>(statements: D1PreparedStatement[]) {
    this.sqlite.exec("BEGIN");
    try {
      const results: D1Result<T>[] = [];
      for (const statement of statements) results.push(await statement.run() as D1Result<T>);
      this.sqlite.exec("COMMIT");
      return results;
    } catch (error) { this.sqlite.exec("ROLLBACK"); throw error; }
  }
}

function environment(): AdminEnv & { DB: LocalD1 } {
  return {
    DB: new LocalD1(),
    ADMIN_INITIAL_PASSWORD: initialPassword,
    ADMIN_PASSWORD_PEPPER: "test-pepper-only-unique-57c09096bd22476da",
    ADMIN_SESSION_SECRET: "test-session-only-different-fb48bcd468c7d",
  };
}

function request(path: string, method = "GET", body?: unknown, cookie?: string, requestOrigin = origin) {
  const headers = new Headers({ origin: requestOrigin, "cf-connecting-ip": "192.0.2.11" });
  if (body !== undefined) headers.set("content-type", "application/json");
  if (cookie) headers.set("cookie", cookie);
  return new Request(`${origin}${path}`, { method, headers, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
}

async function signIn(env: AdminEnv, value = initialPassword) {
  const response = await login({ env, request: request("/api/admin/login", "POST", { email, password: value }) });
  assert.equal(response.status, 200, await response.clone().text());
  const cookie = response.headers.get("set-cookie")!;
  return { response, cookie: cookie.split(";")[0] };
}

function analyticsBody(type = "page_view", overrides: Record<string, unknown> = {}) {
  return { type, visitorId: randomUUID(), eventId: randomUUID(), path: "/", ...overrides };
}

async function analytics(env: AdminEnv, body: unknown) {
  return track({ env, request: request("/api/analytics/track", "POST", body) });
}

test("bootstrap, salted password hashing, signed cookie and authenticated session", async (t) => {
  const env = environment(); t.after(() => env.DB.sqlite.close());
  const { response, cookie } = await signIn(env);
  const setCookie = response.headers.get("set-cookie")!;
  for (const flag of ["HttpOnly", "Secure", "SameSite=Strict", "Path=/api/admin", "Max-Age=28800"]) assert.ok(setCookie.includes(flag));
  const account = await env.DB.prepare("SELECT * FROM admin_users").first<{ password_hash: string; password_salt: string }>();
  assert.ok(account?.password_hash.startsWith("pbkdf2-sha256$100000$"));
  assert.ok(!account?.password_hash.includes(initialPassword));
  assert.equal(account?.password_salt.length, 22);
  const result = await session({ env, request: request("/api/admin/session", "GET", undefined, cookie) });
  assert.equal(result.status, 200);
  assert.equal(result.headers.get("cache-control"), "no-store, max-age=0");
  assert.deepEqual(await result.json(), { authenticated: true, email, mustChangePassword: true });
});

test("all private APIs reject missing cookies; bootstrap rejects wrong credentials", async (t) => {
  const env = environment(); t.after(() => env.DB.sqlite.close());
  assert.equal((await session({ env, request: request("/api/admin/session") })).status, 401);
  assert.equal((await metrics({ env, request: request("/api/admin/metrics") })).status, 401);
  assert.equal((await password({ env, request: request("/api/admin/password", "POST", { currentPassword: initialPassword, newPassword: nextPassword }) })).status, 401);
  const wrong = await login({ env, request: request("/api/admin/login", "POST", { email, password: "incorrect" }) });
  assert.equal(wrong.status, 401);
  assert.equal(await env.DB.prepare("SELECT COUNT(*) AS count FROM admin_users").first<{ count: number }>().then((row) => row?.count), 0);
});

test("cross-origin mutations are rejected", async (t) => {
  const env = environment(); t.after(() => env.DB.sqlite.close());
  const { cookie } = await signIn(env);
  const crossOrigin = "https://untrusted.test";
  assert.equal((await login({ env, request: request("/api/admin/login", "POST", { email, password: initialPassword }, undefined, crossOrigin) })).status, 403);
  assert.equal((await password({ env, request: request("/api/admin/password", "POST", { currentPassword: initialPassword, newPassword: nextPassword }, cookie, crossOrigin) })).status, 403);
  assert.equal((await logout({ env, request: request("/api/admin/logout", "POST", undefined, cookie, crossOrigin) })).status, 403);
  assert.equal((await track({ env, request: request("/api/analytics/track", "POST", analyticsBody(), undefined, crossOrigin) })).status, 403);
});

test("malformed requests, arrays, wrong field types, and oversized JSON are rejected", async (t) => {
  const env = environment(); t.after(() => env.DB.sqlite.close());
  assert.equal((await login({ env, request: request("/api/admin/login", "POST", { email: {}, password: [] }) })).status, 400);
  assert.equal((await login({ env, request: request("/api/admin/login", "POST", []) })).status, 400);
  assert.equal((await login({ env, request: request("/api/admin/login", "POST", { email, password: "x".repeat(5000) }) })).status, 413);
  const malformed = new Request(`${origin}/api/admin/login`, { method: "POST", headers: { origin, "content-type": "application/json" }, body: "{" });
  assert.equal((await login({ env, request: malformed })).status, 400);
});

test("forged and expired signed sessions are rejected", async (t) => {
  const env = environment(); t.after(() => env.DB.sqlite.close());
  const { cookie } = await signIn(env);
  const [name, token] = cookie.split("=");
  const [payload, signature] = token.split(".");
  const tampered = `${name}=${payload}.${signature.startsWith("A") ? "B" : "A"}${signature.slice(1)}`;
  assert.equal((await session({ env, request: request("/api/admin/session", "GET", undefined, tampered) })).status, 401);
  const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  claims.exp = Math.floor(Date.now() / 1000) - 1;
  const expiredPayload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  const expired = `${name}=${expiredPayload}.${await privateKeyHash(expiredPayload, env.ADMIN_SESSION_SECRET!)}`;
  assert.equal((await session({ env, request: request("/api/admin/session", "GET", undefined, expired) })).status, 401);
});

test("logout revokes the server-side session, not just the browser cookie", async (t) => {
  const env = environment(); t.after(() => env.DB.sqlite.close());
  const { cookie } = await signIn(env);
  const result = await logout({ env, request: request("/api/admin/logout", "POST", undefined, cookie) });
  assert.equal(result.status, 200);
  assert.ok(result.headers.get("set-cookie")?.includes("Max-Age=0"));
  assert.equal((await session({ env, request: request("/api/admin/session", "GET", undefined, cookie) })).status, 401);
});

test("profile password change persists, revokes old sessions, and cannot be reset by bootstrap secret", async (t) => {
  const env = environment(); t.after(() => env.DB.sqlite.close());
  const { cookie } = await signIn(env);
  const other = await signIn(env);
  const result = await password({ env, request: request("/api/admin/password", "POST", { currentPassword: initialPassword, newPassword: nextPassword }, cookie) });
  assert.equal(result.status, 200, await result.clone().text());
  const newCookie = result.headers.get("set-cookie")!.split(";")[0];
  for (const oldCookie of [cookie, other.cookie]) assert.equal((await session({ env, request: request("/api/admin/session", "GET", undefined, oldCookie) })).status, 401);
  const refreshed = await session({ env, request: request("/api/admin/session", "GET", undefined, newCookie) });
  assert.equal(refreshed.status, 200);
  assert.equal((await refreshed.json() as { mustChangePassword: boolean }).mustChangePassword, false);
  assert.equal((await login({ env, request: request("/api/admin/login", "POST", { email, password: initialPassword }) })).status, 401);
  await signIn(env, nextPassword);
  env.ADMIN_INITIAL_PASSWORD = "ChangedBootstrapSecret@123";
  assert.equal((await login({ env, request: request("/api/admin/login", "POST", { email, password: env.ADMIN_INITIAL_PASSWORD }) })).status, 401);
});

test("incorrect current passwords and weak replacement passwords leave account unchanged", async (t) => {
  const env = environment(); t.after(() => env.DB.sqlite.close());
  const { cookie } = await signIn(env);
  for (const body of [{ currentPassword: "incorrect", newPassword: nextPassword }, { currentPassword: initialPassword, newPassword: "short" }, { currentPassword: initialPassword, newPassword: initialPassword }]) {
    assert.equal((await password({ env, request: request("/api/admin/password", "POST", body, cookie) })).status, 400);
  }
  assert.equal((await session({ env, request: request("/api/admin/session", "GET", undefined, cookie) })).status, 200);
});

test("brute-force login attempts are rate limited", async (t) => {
  const env = environment(); t.after(() => env.DB.sqlite.close());
  for (let index = 0; index < 10; index++) {
    assert.equal((await login({ env, request: request("/api/admin/login", "POST", { email: "wrong@example.test", password: "incorrect" }) })).status, 401);
  }
  const result = await login({ env, request: request("/api/admin/login", "POST", { email, password: initialPassword }) });
  assert.equal(result.status, 429);
  assert.ok(Number(result.headers.get("retry-after")) > 0);
});

test("unconfigured bindings fail closed with setup errors rather than fake data", async () => {
  const env = {};
  assert.equal((await login({ env, request: request("/api/admin/login", "POST", { email, password: initialPassword }) })).status, 503);
  assert.equal((await session({ env, request: request("/api/admin/session") })).status, 503);
  assert.equal((await metrics({ env, request: request("/api/admin/metrics") })).status, 503);
  assert.equal((await analytics(env, analyticsBody())).status, 503);
});

test("analytics records real events, deduplicates plays, hashes visitors and returns a seven-day chart", async (t) => {
  const env = environment(); t.after(() => env.DB.sqlite.close());
  const { cookie } = await signIn(env);
  const initial = await metrics({ env, request: request("/api/admin/metrics", "GET", undefined, cookie) });
  const initialData = await initial.json() as Record<string, unknown>;
  assert.equal(initialData.totalViews, 0);
  const visitorId = randomUUID();
  const page = analyticsBody("page_view", { visitorId });
  for (const event of [page, page, analyticsBody("heartbeat", { visitorId }),
    analyticsBody("video_view", { visitorId, path: "/video/0/", videoId: 0 }),
    analyticsBody("video_view", { visitorId, path: "/video/0/", videoId: 0 }),
    analyticsBody("video_view", { path: "/video/0/", videoId: 0 })]) assert.equal((await analytics(env, event)).status, 204);
  const result = await metrics({ env, request: request("/api/admin/metrics", "GET", undefined, cookie) });
  assert.equal(result.status, 200);
  const data = await result.json() as { totalViews: number; totalPageViews: number; viewsToday: number; activeVisitors: number; totalVideos: number; totalModels: number; totalChannels: number; totalCategories: number; last7Days: Array<{ views: number }>; topVideos: Array<{ id: number; views: number }> };
  assert.equal(data.totalViews, 2);
  assert.equal(data.totalPageViews, 1);
  assert.equal(data.viewsToday, 2);
  assert.equal(data.activeVisitors, 2);
  assert.equal(data.totalVideos, videos.length);
  assert.equal(data.totalModels, performers.length);
  assert.equal(data.totalChannels, channelDirectory.length);
  assert.equal(data.totalCategories, categoryDirectory.length);
  assert.equal(data.last7Days.length, 7);
  assert.equal(data.last7Days.reduce((sum, day) => sum + day.views, 0), 2);
  assert.deepEqual(data.topVideos.map(({ id, views }) => ({ id, views })), [{ id: 0, views: 2 }]);
  const visitorRows = await env.DB.prepare("SELECT visitor_hash FROM analytics_visitors").all<{ visitor_hash: string }>();
  assert.ok(visitorRows.results!.every((row) => row.visitor_hash.length === 43 && row.visitor_hash !== visitorId));
});

test("admin paths, invented videos and invalid visitor identifiers are not tracked", async (t) => {
  const env = environment(); t.after(() => env.DB.sqlite.close());
  for (const event of [analyticsBody("page_view", { path: "/admin/" }), analyticsBody("video_view", { videoId: 9999, path: "/video/9999/" }), analyticsBody("video_view", { videoId: 0, path: "/video/1/" }), analyticsBody("page_view", { visitorId: "invalid" })]) {
    assert.equal((await analytics(env, event)).status, 400);
  }
  assert.equal(await env.DB.prepare("SELECT COUNT(*) AS count FROM analytics_events").first<{ count: number }>().then((row) => row?.count), 0);
});

test("old heartbeats expire from the realtime visitor count", async (t) => {
  const env = environment(); t.after(() => env.DB.sqlite.close());
  const { cookie } = await signIn(env);
  await analytics(env, analyticsBody());
  await env.DB.prepare("UPDATE analytics_visitors SET last_seen = ?").bind(new Date(Date.now() - 6 * 60_000).toISOString()).run();
  const result = await metrics({ env, request: request("/api/admin/metrics", "GET", undefined, cookie) });
  assert.equal((await result.json() as { activeVisitors: number }).activeVisitors, 0);
});

test("password guessing is independently rate limited", async (t) => {
  const env = environment(); t.after(() => env.DB.sqlite.close());
  const { cookie } = await signIn(env);
  for (let index = 0; index < 5; index++) {
    assert.equal((await password({ env, request: request("/api/admin/password", "POST", { currentPassword: "incorrect", newPassword: nextPassword }, cookie) })).status, 400);
  }
  const limited = await password({ env, request: request("/api/admin/password", "POST", { currentPassword: initialPassword, newPassword: nextPassword }, cookie) });
  assert.equal(limited.status, 429);
  assert.ok(Number(limited.headers.get("retry-after")) > 0);
});

test("analytics floods are limited without recording extra events", async (t) => {
  const env = environment(); t.after(() => env.DB.sqlite.close());
  const visitorId = randomUUID();
  for (let index = 0; index < 30; index++) assert.equal((await analytics(env, analyticsBody("heartbeat", { visitorId }))).status, 204);
  assert.equal((await analytics(env, analyticsBody("page_view", { visitorId }))).status, 429);
  assert.equal(await env.DB.prepare("SELECT COUNT(*) AS count FROM analytics_events").first<{ count: number }>().then((row) => row?.count), 0);
});

test("UTC charts include only seven days while lifetime counts include older plays", async (t) => {
  const env = environment(); t.after(() => env.DB.sqlite.close());
  const { cookie } = await signIn(env);
  for (const daysAgo of [0, 3, 8]) {
    const when = new Date(); when.setUTCDate(when.getUTCDate() - daysAgo);
    await env.DB.prepare("INSERT INTO analytics_events (dedupe_key, event_type, visitor_hash, page_path, video_id, created_at) VALUES (?, 'video_view', ?, '/video/0', 0, ?)")
      .bind(`fixture:${daysAgo}`, `visitor:${daysAgo}`, when.toISOString()).run();
  }
  const response = await metrics({ env, request: request("/api/admin/metrics", "GET", undefined, cookie) });
  const data = await response.json() as { totalViews: number; viewsToday: number; last7Days: Array<{ date: string; views: number }> };
  assert.equal(data.totalViews, 3);
  assert.equal(data.viewsToday, 1);
  assert.equal(data.last7Days.reduce((sum, day) => sum + day.views, 0), 2);
  assert.equal(data.last7Days.at(-1)?.date, new Date().toISOString().slice(0, 10));
});

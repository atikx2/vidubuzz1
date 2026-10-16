import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { sessionCookie } from "../functions/_shared/admin-auth";
import { validDeployHook, validateModel, type ModelEnv } from "../functions/_shared/models";
import { onRequestGet as config } from "../functions/api/admin/models/config";
import { onRequestGet as library } from "../functions/api/admin/models/index";
import { onRequestPost as save } from "../functions/api/admin/models/save";
import { onRequestPost as publish } from "../functions/api/admin/models/publish";
import { onRequestGet as mediaLibrary } from "../functions/api/admin/media/index";
import { onRequestGet as metrics } from "../functions/api/admin/metrics";
import { COUNTRY_OPTIONS, modelDescription, modelSeoTitle, safeJsonLd, slugifyModel, type ManagedModel, type ModelConfig, type ModelList } from "../lib/models";
import { LocalD1 } from "./helpers/local-d1";

const origin = "https://vidubuzz.test";
const email = "models-admin@example.test";
type Env = ModelEnv & { DB: LocalD1 };
async function setup(migrate = true) {
  const env: Env = { DB: new LocalD1(true, migrate), ADMIN_EMAIL: email,
    ADMIN_PASSWORD_PEPPER: "fixture-model-pepper-different-6eec2860d71511",
    ADMIN_SESSION_SECRET: "fixture-model-session-private-879dd30d0786",
    R2_ACCOUNT_ID: "a".repeat(32), R2_BUCKET_NAME: "test-assets", R2_PUBLIC_BASE_URL: "https://assets.example.test",
    R2_ACCESS_KEY_ID: "fixture-model-access-not-real", R2_SECRET_ACCESS_KEY: "fixture-model-secret-not-real-6bd0a991e9",
    ASSETS_BUCKET: { head: async () => null, get: async () => null, delete: async () => undefined } };
  await env.DB.prepare("INSERT INTO admin_users (email, password_salt, password_hash) VALUES (?, 'fixture-salt', 'fixture-hash')").bind(email).run();
  return { env, cookie: (await sessionCookie(email, 1, env)).split(";")[0] };
}
function request(path: string, method = "GET", body?: unknown, cookie?: string, from = origin) {
  const headers = new Headers({ origin: from, "content-type": "application/json" }); if (cookie) headers.set("cookie", cookie);
  return new Request(origin + path, { method, headers, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
}
function input(extra: Record<string, unknown> = {}) { return { name: "Example Model", slug: "example-model", description: "A unique adult model biography written with verified information.", adultConfirmed: true, ...extra }; }
async function saveModel(env: Env, cookie: string, extra: Record<string, unknown> = {}, status = 201) {
  const response = await save({ env, request: request("/api/admin/models/save", "POST", input(extra), cookie) });
  assert.equal(response.status, status, await response.clone().text());
  return (await response.json() as { model: ManagedModel }).model;
}
async function asset(env: Env, contentType = "image/jpeg", status = "ready", owner = email) {
  const id = randomUUID();
  const purpose = contentType.startsWith("image/") ? "model-photo" : "preview";
  const key = `media/${purpose === "preview" ? "previews/preview" : "images/model-photo"}/2026/10/${id}.${purpose === "preview" ? "mp4" : "jpg"}`;
  await env.DB.prepare(`INSERT INTO media_assets (id, object_key, purpose, original_filename, content_type, size_bytes,
    width, height, duration_seconds, status, uploader_email, upload_expires_at) VALUES (?, ?, ?, 'photo.jpg', ?, 256, 640, 800, ?, ?, ?, ?)`)
    .bind(id, key, purpose, contentType, purpose === "preview" ? 5 : null, status, owner, new Date(Date.now() + 600_000).toISOString()).run();
  return id;
}
async function getList(env: Env, cookie: string, query = "") {
  const response = await library({ env, request: request(`/api/admin/models/${query}`, "GET", undefined, cookie) });
  assert.equal(response.status, 200, await response.clone().text()); return await response.json() as ModelList;
}

test("model endpoints are admin-only and mutations reject cross-origin requests", async (t) => {
  const { env, cookie } = await setup(); t.after(() => env.DB.sqlite.close());
  assert.equal((await config({ env, request: request("/api/admin/models/config") })).status, 401);
  assert.equal((await library({ env, request: request("/api/admin/models/") })).status, 401);
  assert.equal((await save({ env, request: request("/api/admin/models/save", "POST", input()) })).status, 401);
  assert.equal((await publish({ env, request: request("/api/admin/models/publish", "POST") })).status, 401);
  assert.equal((await save({ env, request: request("/api/admin/models/save", "POST", input(), cookie, "https://evil.test") })).status, 403);
  assert.equal((await publish({ env, request: request("/api/admin/models/publish", "POST", undefined, cookie, "https://evil.test") })).status, 403);
  const crossSite = request("/api/admin/models/save", "POST", input(), cookie); crossSite.headers.set("sec-fetch-site", "cross-site");
  assert.equal((await save({ env, request: crossSite })).status, 403);
});

test("configuration safely reports migration/publishing setup and never returns tokens or hook URLs", async (t) => {
  const { env, cookie } = await setup(false); t.after(() => env.DB.sqlite.close());
  env.D1_READ_TOKEN = "fixture-read-token-private"; env.D1_DATABASE_ID = randomUUID();
  env.PAGES_DEPLOY_HOOK = "https://api.cloudflare.com/client/v4/pages/webhooks/deploy_hooks/fixture-private-hook";
  let response = await config({ env, request: request("/api/admin/models/config", "GET", undefined, cookie) });
  let text = await response.text(); let data = JSON.parse(text) as ModelConfig;
  assert.equal(data.migrationApplied, false); assert.equal(data.publishingConfigured, false);
  assert.ok(!text.includes(env.D1_READ_TOKEN)); assert.ok(!text.includes(env.PAGES_DEPLOY_HOOK)); assert.ok(!text.includes(env.R2_SECRET_ACCESS_KEY!));
  assert.equal((await library({ env, request: request("/api/admin/models/", "GET", undefined, cookie) })).status, 503);
  // Sessions are database-specific, so use the same authenticated database after applying the migration.
  env.DB.sqlite.exec((await import("node:fs")).readFileSync(new URL("../migrations/0003_models.sql", import.meta.url), "utf8"));
  response = await config({ env, request: request("/api/admin/models/config", "GET", undefined, cookie) });
  data = await response.json() as ModelConfig; assert.equal(data.migrationApplied, true); assert.equal(data.publishingConfigured, true);
});

test("the complete imported catalog is visible with fictional demo labels and no invented facts", async (t) => {
  const { env, cookie } = await setup(); t.after(() => env.DB.sqlite.close());
  const list = await getList(env, cookie);
  assert.equal(list.total, 6); assert.equal(list.models.length, 6); assert.equal(list.stats.published, 6);
  for (const model of list.models) { assert.equal(model.source, "demo"); assert.equal(model.age, null); assert.equal(model.countryCode, null); assert.ok(model.description.includes("demo profile")); }
});

test("minimal creation defaults to draft; country, age, image and SEO overrides are truly optional", async (t) => {
  const { env, cookie } = await setup(); t.after(() => env.DB.sqlite.close());
  const model = await saveModel(env, cookie);
  assert.equal(model.status, "draft"); assert.equal(model.age, null); assert.equal(model.countryCode, null);
  assert.equal(model.photoAssetId, null); assert.equal(model.imageUrl, null); assert.equal(model.source, "admin"); assert.equal(model.revision, 1);
  assert.equal(model.seoTitle, ""); assert.equal(model.metaDescription, "");
  const reserved = await env.DB.prepare("SELECT entity_id FROM content_slugs WHERE slug = 'example-model'").first<{ entity_id: string }>();
  assert.equal(reserved?.entity_id, model.id);
  const result = await metrics({ env, request: request("/api/admin/metrics", "GET", undefined, cookie) });
  assert.equal((await result.json() as { totalModels: number }).totalModels, 7);
});

test("invalid/underage, unconfirmed, HTML, excessive and malformed model fields are rejected", async (t) => {
  const { env, cookie } = await setup(); t.after(() => env.DB.sqlite.close());
  const cases = [{ age: 17 }, { age: 121 }, { age: 18.5 }, { age: "21" }, { adultConfirmed: false }, { adultConfirmed: "true" },
    { countryCode: "XX" }, { countryCode: "us" }, { slug: "UPPERCASE" }, { slug: "bad--slug" }, { slug: "../admin" }, { name: " " },
    { name: "<script>alert(1)</script>" }, { description: "<b>HTML</b>" }, { description: "" }, { name: "a".repeat(101) },
    { description: "a".repeat(8001) }, { status: "live" }, { seoTitle: "a".repeat(101) }, { imageAlt: "a".repeat(161) }, { photoAssetId: "not-uuid" }];
  for (const extra of cases) { const response = await save({ env, request: request("/api/admin/models/save", "POST", input(extra), cookie) }); assert.equal(response.status, 400, await response.clone().text()); }
  assert.equal((await getList(env, cookie)).total, 6);
  const response = await save({ env, request: request("/api/admin/models/save", "POST", input({ description: "a".repeat(70_000) }), cookie) }); assert.equal(response.status, 413);
});

test("verified non-Latin biographies fit the bounded request and adult age boundaries are inclusive", async (t) => {
  const { env, cookie } = await setup(); t.after(() => env.DB.sqlite.close());
  const first = await saveModel(env, cookie, { age: 18, countryCode: "BD", description: "অ".repeat(8000) });
  assert.equal(first.description.length, 8000); assert.equal(first.age, 18); assert.equal(first.countryCode, "BD");
  const second = await saveModel(env, cookie, { slug: "second-model", age: 120 }); assert.equal(second.age, 120);
});

test("model photos must be verified images owned by the admin; public status requires a photo", async (t) => {
  const { env, cookie } = await setup(); t.after(() => env.DB.sqlite.close());
  await env.DB.prepare("INSERT INTO admin_users (email, password_salt, password_hash) VALUES ('other@example.test', 's', 'h')").run();
  const invalid = [randomUUID(), await asset(env, "image/jpeg", "pending"), await asset(env, "video/mp4"), await asset(env, "image/jpeg", "ready", "other@example.test")];
  for (const photoAssetId of invalid) assert.equal((await save({ env, request: request("/api/admin/models/save", "POST", input({ photoAssetId }), cookie) })).status, 400);
  assert.equal((await save({ env, request: request("/api/admin/models/save", "POST", input({ status: "published" }), cookie) })).status, 400);
  const photo = await asset(env);
  const model = await saveModel(env, cookie, { status: "published", photoAssetId: photo, imageUrl: "https://evil.test/ignored.jpg" });
  assert.equal(model.status, "published"); assert.equal(model.photoAssetId, photo); assert.ok(model.imageUrl?.startsWith("https://assets.example.test/media/images/model-photo/"));
  assert.ok(!model.imageUrl?.includes("evil.test"));
  const list = await mediaLibrary({ env, request: request("/api/admin/media/?kind=image", "GET", undefined, cookie) });
  assert.equal(list.status, 200, await list.clone().text());
  const gallery = await list.json() as { assets: Array<{ contentType: string }> }; assert.ok(gallery.assets.length > 0); assert.ok(gallery.assets.every((image) => image.contentType.startsWith("image/")));
});

test("duplicate, channel and reserved slugs are atomic conflicts with no orphan model insertion", async (t) => {
  const { env, cookie } = await setup(); t.after(() => env.DB.sqlite.close());
  const first = await saveModel(env, cookie); const before = (await getList(env, cookie)).total;
  for (const slug of [first.slug, "velvet-room", "admin", "api", "categories", "pornstars", "maya-sol"]) {
    const response = await save({ env, request: request("/api/admin/models/save", "POST", input({ slug }), cookie) });
    assert.equal(response.status, 409, await response.clone().text());
  }
  assert.equal((await getList(env, cookie)).total, before);
});

test("edits preserve stable URLs, increment revisions, archive safely, and reject stale writes", async (t) => {
  const { env, cookie } = await setup(); t.after(() => env.DB.sqlite.close());
  const model = await saveModel(env, cookie);
  const updated = await saveModel(env, cookie, { ...model, name: "Updated Model", age: 25, countryCode: "US", status: "archived" }, 200);
  assert.equal(updated.revision, 2); assert.equal(updated.createdAt, model.createdAt); assert.equal(updated.slug, model.slug); assert.equal(updated.status, "archived");
  assert.equal((await save({ env, request: request("/api/admin/models/save", "POST", input({ ...model, name: "Stale write" }), cookie) })).status, 409);
  assert.equal((await save({ env, request: request("/api/admin/models/save", "POST", input({ ...updated, slug: "different-url" }), cookie) })).status, 400);
  assert.equal((await save({ env, request: request("/api/admin/models/save", "POST", input({ ...updated, revision: undefined }), cookie) })).status, 400);
  assert.equal((await save({ env, request: request("/api/admin/models/save", "POST", input({ ...updated, id: randomUUID() }), cookie) })).status, 404);
});

test("converting a demo requires explicit adult confirmation and an R2 photo for public selection", async (t) => {
  const { env, cookie } = await setup(); t.after(() => env.DB.sqlite.close());
  const demo = (await getList(env, cookie)).models[0];
  assert.equal((await save({ env, request: request("/api/admin/models/save", "POST", { ...demo, adultConfirmed: false }, cookie) })).status, 400);
  assert.equal((await save({ env, request: request("/api/admin/models/save", "POST", demo, cookie) })).status, 400);
  const converted = await saveModel(env, cookie, { ...demo, status: "draft" }, 200);
  assert.equal(converted.source, "admin"); assert.equal(converted.imageUrl, null); assert.equal(converted.revision, 2);
});

test("list search uses bound literal patterns, supports filters/sorting and returns correct pagination", async (t) => {
  const { env, cookie } = await setup(); t.after(() => env.DB.sqlite.close());
  for (let index = 0; index < 13; index++) await saveModel(env, cookie, { name: `Catalog ${String(index).padStart(2, "0")}`, slug: `catalog-${index}`, countryCode: "BD" });
  const first = await getList(env, cookie, "?status=draft&country=BD&sort=name&page=1");
  assert.equal(first.total, 13); assert.equal(first.totalPages, 2); assert.equal(first.models.length, 12); assert.equal(first.models[0].name, "Catalog 00");
  const second = await getList(env, cookie, "?status=draft&country=BD&sort=name&page=2"); assert.equal(second.models.length, 1); assert.equal(second.models[0].name, "Catalog 12"); assert.equal(second.stats.total, 19);
  await saveModel(env, cookie, { name: "100%_Verified", slug: "literal-model" });
  assert.equal((await getList(env, cookie, "?q=" + encodeURIComponent("%_"))).total, 1);
  assert.equal((await getList(env, cookie, "?q=" + encodeURIComponent("' OR 1=1 --"))).total, 0);
  for (const query of ["?page=-1", "?page=1.5", "?status=unknown", "?country=XX", "?sort=DROP", "?q=" + "a".repeat(101)]) assert.equal((await library({ env, request: request("/api/admin/models/" + query, "GET", undefined, cookie) })).status, 400);
});

test("model saves are rate limited with a Retry-After header", async (t) => {
  const { env, cookie } = await setup(); t.after(() => env.DB.sqlite.close());
  for (let index = 0; index < 30; index++) await saveModel(env, cookie, { slug: `limited-${index}` });
  const response = await save({ env, request: request("/api/admin/models/save", "POST", input(), cookie) });
  assert.equal(response.status, 429); assert.ok(response.headers.get("retry-after"));
});

test("deploy hooks are HTTPS Cloudflare endpoints only, with no redirects or credential-bearing query", () => {
  assert.equal(validDeployHook("https://api.cloudflare.com/client/v4/pages/webhooks/deploy_hooks/fixture-id"), true);
  for (const value of [undefined, "https://evil.test/hook", "http://api.cloudflare.com/client/v4/pages/webhooks/deploy_hooks/id", "https://api.cloudflare.com.evil.test/client/v4/pages/webhooks/deploy_hooks/id", "https://secret@api.cloudflare.com/client/v4/pages/webhooks/deploy_hooks/id", "https://api.cloudflare.com/client/v4/pages/webhooks/deploy_hooks/id?token=secret", "https://api.cloudflare.com/client/v4/pages/webhooks/deploy_hooks/id#secret"]) assert.equal(validDeployHook(value), false);
});

test("publishing queues a build, is rate-limited, and never claims the new site is already live", async (t) => {
  const { env, cookie } = await setup(); t.after(() => env.DB.sqlite.close());
  assert.equal((await publish({ env, request: request("/api/admin/models/publish", "POST", undefined, cookie) })).status, 503);
  env.D1_DATABASE_ID = randomUUID(); env.D1_READ_TOKEN = "private-build-read-fixture";
  env.PAGES_DEPLOY_HOOK = "https://api.cloudflare.com/client/v4/pages/webhooks/deploy_hooks/private-fixture-hook";
  const fetchMock = t.mock.method(globalThis, "fetch", async (url: string | URL | Request, options?: RequestInit) => {
    assert.equal(String(url), env.PAGES_DEPLOY_HOOK); assert.equal(options?.method, "POST"); assert.equal(options?.redirect, "error");
    return Response.json({ success: true });
  });
  for (let index = 0; index < 3; index++) {
    const response = await publish({ env, request: request("/api/admin/models/publish", "POST", undefined, cookie) }); const text = await response.text();
    assert.equal(response.status, 202); assert.equal(JSON.parse(text).queued, true); assert.ok(text.includes("not live")); assert.ok(!text.includes(env.D1_READ_TOKEN)); assert.ok(!text.includes(env.PAGES_DEPLOY_HOOK));
  }
  assert.equal((await publish({ env, request: request("/api/admin/models/publish", "POST", undefined, cookie) })).status, 429);
  assert.equal(fetchMock.mock.callCount(), 3);
});

test("failed deploy hooks return safe errors, not private Cloudflare responses", async (t) => {
  const { env, cookie } = await setup(); t.after(() => env.DB.sqlite.close());
  env.D1_DATABASE_ID = randomUUID(); env.D1_READ_TOKEN = "private-read-fixture"; env.PAGES_DEPLOY_HOOK = "https://api.cloudflare.com/client/v4/pages/webhooks/deploy_hooks/fixture-id";
  t.mock.method(globalThis, "fetch", async () => new Response("private upstream details", { status: 403 }));
  const response = await publish({ env, request: request("/api/admin/models/publish", "POST", undefined, cookie) });
  assert.equal(response.status, 502); assert.ok(!(await response.text()).includes("private upstream details"));
});

test("SEO/slug helpers are predictable, country options include Bangladesh, and JSON-LD cannot break out of a script", () => {
  assert.equal(slugifyModel("  Léna & Vale!  "), "lena-vale"); assert.ok(slugifyModel("a".repeat(200)).length <= 80);
  assert.ok(COUNTRY_OPTIONS.some((item) => item.code === "BD" && item.name === "Bangladesh"));
  assert.equal(modelSeoTitle("Example"), "Example Profile & Videos | Vidubuzz"); assert.equal(modelSeoTitle("Example", " Custom title "), "Custom title");
  assert.ok(modelDescription("Example", "Helpful biography. ".repeat(50)).length <= 160);
  assert.equal(modelDescription("Example", "Biography", "Custom snippet"), "Custom snippet");
  const encoded = safeJsonLd({ name: "</script><script>alert(1)</script>" }); assert.ok(!encoded.includes("<")); assert.equal(JSON.parse(encoded).name, "</script><script>alert(1)</script>");
  assert.equal(validateModel(input()).status, "draft");
});

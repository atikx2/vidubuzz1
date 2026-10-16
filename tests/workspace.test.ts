import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { sessionCookie } from "../functions/_shared/admin-auth";
import type { PlatformEnv } from "../functions/_shared/platform";
import { onRequestGet as connections } from "../functions/api/admin/connections";
import { onRequestGet as settingsGet, onRequestPost as settingsSave } from "../functions/api/admin/settings";
import { onRequestGet as catalogGet } from "../functions/api/admin/catalog/index";
import { onRequestPost as catalogSave } from "../functions/api/admin/catalog/save";
import { onRequestGet as pagesGet } from "../functions/api/admin/pages/index";
import { onRequestPost as pagesSave } from "../functions/api/admin/pages/save";
import { onRequestPost as publish } from "../functions/api/admin/publish";
import { onRequestPost as legacyPublish } from "../functions/api/admin/models/publish";
import { onRequestPost as modelSave } from "../functions/api/admin/models/save";
import { onRequestGet as metrics } from "../functions/api/admin/metrics";
import { DEFAULT_SITE_SETTINGS, THEME_PRESETS, accentText, catalogSlug, contrastRatio, siteThemeStyle, validateSiteSettings,
  type CatalogList, type InformationPage, type ManagedCatalogEntry, type PlatformConfig, type SettingsRecord } from "../lib/platform";
import { LocalD1 } from "./helpers/local-d1";
const origin = "https://workspace.example.test", email = "workspace-qa@example.test";
type Env = PlatformEnv & { DB: LocalD1 };
async function setup(migrate = true) {
  const env: Env = { DB: new LocalD1(true, true, migrate), ADMIN_EMAIL: email, ADMIN_PASSWORD_PEPPER: "fixture-private-pepper-workspace-not-live-12345", ADMIN_SESSION_SECRET: "fixture-session-workspace-different-67890",
    R2_ACCOUNT_ID: "a".repeat(32), R2_BUCKET_NAME: "test-assets", R2_PUBLIC_BASE_URL: "https://assets.example.test", R2_ACCESS_KEY_ID: "fixture-private-r2-access-key", R2_SECRET_ACCESS_KEY: "fixture-private-r2-secret-value-never-display-1234",
    ASSETS_BUCKET: { head: async () => null, get: async () => null, delete: async () => undefined } };
  await env.DB.prepare("INSERT INTO admin_users (email, password_salt, password_hash, must_change_password) VALUES (?, 'salt-keep-me', 'hash-keep-me', 0)").bind(email).run();
  return { env, cookie: (await sessionCookie(email, 1, env)).split(";")[0] };
}
function request(path: string, method = "GET", body?: unknown, cookie?: string, from = origin) {
  const headers = new Headers({ origin: from, "content-type": "application/json" }); if (cookie) headers.set("cookie", cookie);
  return new Request(origin + path, { method, headers, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
}
const catalogInput = (extra: Record<string, unknown> = {}) => ({ kind: "channel", name: "A real test channel", slug: "a-real-test-channel", ...extra });
async function saveCatalog(env: Env, cookie: string, extra: Record<string, unknown> = {}, status = 201) {
  const response = await catalogSave({ env, request: request("/api/admin/catalog/save", "POST", catalogInput(extra), cookie) }); assert.equal(response.status, status, await response.clone().text());
  return (await response.json() as { entry: ManagedCatalogEntry }).entry;
}
async function getSettings(env: Env, cookie: string) { const response = await settingsGet({ env, request: request("/api/admin/settings", "GET", undefined, cookie) }); assert.equal(response.status, 200); return await response.json() as SettingsRecord; }
async function getPages(env: Env, cookie: string) { const response = await pagesGet({ env, request: request("/api/admin/pages/", "GET", undefined, cookie) }); assert.equal(response.status, 200); return (await response.json() as { pages: InformationPage[] }).pages; }
async function image(env: Env, status = "ready", type = "image/jpeg") {
  const id = randomUUID(); await env.DB.prepare(`INSERT INTO media_assets (id, object_key, purpose, original_filename, content_type, size_bytes, width, height, status, uploader_email, upload_expires_at)
    VALUES (?, ?, 'channel-photo', 'fixture.jpg', ?, 256, 640, 800, ?, ?, '2026-10-16T18:00:00.000Z')`).bind(id, `media/images/channel-photo/2026/10/${id}.jpg`, type, status, email).run(); return id;
}

test("workspace endpoints are admin-only and all mutations reject cross-origin requests", async (t) => {
  const { env, cookie } = await setup(); t.after(() => env.DB.sqlite.close());
  for (const [handler, path] of [[connections, "/api/admin/connections"], [settingsGet, "/api/admin/settings"], [catalogGet, "/api/admin/catalog/?kind=channel"], [pagesGet, "/api/admin/pages/"]] as const) assert.equal((await handler({ env, request: request(path) })).status, 401);
  for (const [handler, path] of [[settingsSave, "/api/admin/settings"], [catalogSave, "/api/admin/catalog/save"], [pagesSave, "/api/admin/pages/save"], [publish, "/api/admin/publish"]] as const) {
    assert.equal((await handler({ env, request: request(path, "POST", {}) })).status, 401);
    assert.equal((await handler({ env, request: request(path, "POST", {}, cookie, "https://other.test") })).status, 403);
    const cross = request(path, "POST", {}, cookie); cross.headers.set("sec-fetch-site", "cross-site"); assert.equal((await handler({ env, request: cross })).status, 403);
  }
});

test("migration 0004 is idempotent, preserves login/models/media, and seeds honest demo/draft records", async (t) => {
  const { env, cookie } = await setup(); t.after(() => env.DB.sqlite.close()); const photo = await image(env);
  const minimal = await modelSave({ env, request: request("/api/admin/models/save", "POST", { name: "Only a name", adultConfirmed: true }, cookie) }); assert.equal(minimal.status, 201);
  env.DB.sqlite.exec(readFileSync(new URL("../migrations/0004_workspace.sql", import.meta.url), "utf8"));
  assert.equal(env.DB.sqlite.prepare("SELECT COUNT(*) AS n FROM models").get()?.n, 7);
  assert.equal(env.DB.sqlite.prepare("SELECT password_hash FROM admin_users WHERE email = ?").get(email)?.password_hash, "hash-keep-me");
  assert.equal(env.DB.sqlite.prepare("SELECT id FROM media_assets WHERE id = ?").get(photo)?.id, photo);
  assert.equal(env.DB.sqlite.prepare("SELECT COUNT(*) AS n FROM catalog_entries").get()?.n, 20);
  assert.equal(env.DB.sqlite.prepare("SELECT COUNT(*) AS n FROM site_settings").get()?.n, 1);
  const pages = await getPages(env, cookie); assert.equal(pages.length, 5); assert.ok(pages.every((page) => page.status === "draft" && !page.reviewConfirmed && page.noindex));
  assert.deepEqual(env.DB.sqlite.prepare("PRAGMA foreign_key_check").all(), []);
});

test("connection status is useful before migration and never leaks secrets or claims live credential verification", async (t) => {
  const { env, cookie } = await setup(false); t.after(() => env.DB.sqlite.close());
  env.D1_READ_TOKEN = "never-display-private-d1-read-token"; env.D1_DATABASE_ID = randomUUID(); env.PAGES_DEPLOY_HOOK = "https://api.cloudflare.com/client/v4/pages/webhooks/deploy_hooks/private-fixture-hook";
  let response = await connections({ env, request: request("/api/admin/connections", "GET", undefined, cookie) }); let text = await response.text(), data = JSON.parse(text) as PlatformConfig;
  assert.equal(data.migrationApplied, false); assert.equal(data.publishingConfigured, false); assert.ok(data.publishMissing.includes("migrations/0004_workspace.sql"));
  for (const secret of [env.D1_READ_TOKEN, env.PAGES_DEPLOY_HOOK, env.R2_ACCESS_KEY_ID!, env.R2_SECRET_ACCESS_KEY!, env.ADMIN_SESSION_SECRET!, env.ADMIN_PASSWORD_PEPPER!]) assert.ok(!text.includes(secret));
  assert.match(text, /not live-tested/); assert.equal((await settingsGet({ env, request: request("/api/admin/settings", "GET", undefined, cookie) })).status, 503);
  env.DB.sqlite.exec(readFileSync(new URL("../migrations/0004_workspace.sql", import.meta.url), "utf8"));
  response = await connections({ env, request: request("/api/admin/connections", "GET", undefined, cookie) }); data = await response.json() as PlatformConfig;
  assert.equal(data.migrationApplied, true); assert.equal(data.publishingConfigured, true);
});

test("name-only model drafts and generated non-Latin slugs still require adult confirmation", async (t) => {
  const { env, cookie } = await setup(); t.after(() => env.DB.sqlite.close());
  for (const name of ["Simple Name", "নতুন মডেল"]) {
    const response = await modelSave({ env, request: request("/api/admin/models/save", "POST", { name, adultConfirmed: true }, cookie) }); assert.equal(response.status, 201);
    const { model } = await response.json() as { model: { slug: string; description: string; status: string; age: number | null } }; assert.match(model.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/); assert.equal(model.description, ""); assert.equal(model.age, null); assert.equal(model.status, "draft");
  }
  assert.equal((await modelSave({ env, request: request("/api/admin/models/save", "POST", { name: "Unconfirmed" }, cookie) })).status, 400);
  assert.equal((await modelSave({ env, request: request("/api/admin/models/save", "POST", { name: "About", slug: "about", adultConfirmed: true }, cookie) })).status, 409);
});

test("channel/category drafts are minimal, editable, archivable, and URLs/revisions are protected", async (t) => {
  const { env, cookie } = await setup(); t.after(() => env.DB.sqlite.close()); const entry = await saveCatalog(env, cookie);
  assert.equal(entry.status, "draft"); assert.equal(entry.description, ""); assert.equal(entry.photoAssetId, null); assert.equal(entry.source, "admin");
  const changed = await saveCatalog(env, cookie, { ...entry, name: "Updated name", status: "archived" }, 200); assert.equal(changed.revision, 2); assert.equal(changed.status, "archived");
  const stale = await catalogSave({ env, request: request("/api/admin/catalog/save", "POST", entry, cookie) }); assert.equal(stale.status, 409);
  const moved = await catalogSave({ env, request: request("/api/admin/catalog/save", "POST", { ...changed, slug: "new-address" }, cookie) }); assert.equal(moved.status, 400);
  assert.equal(env.DB.sqlite.prepare("SELECT entity_id FROM content_slugs WHERE slug = ?").get(entry.slug)?.entity_id, entry.id);
  const category = await saveCatalog(env, cookie, { kind: "category", slug: "maya-sol", name: "Nested category" }); assert.equal(category.kind, "category");
});

test("channel URL conflicts roll back atomically against models/system paths and nested category uniqueness", async (t) => {
  const { env, cookie } = await setup(); t.after(() => env.DB.sqlite.close());
  for (const slug of ["maya-sol", "admin", "about", "velvet-room"]) assert.equal((await catalogSave({ env, request: request("/api/admin/catalog/save", "POST", catalogInput({ slug }), cookie) })).status, 409);
  assert.equal(env.DB.sqlite.prepare("SELECT COUNT(*) AS n FROM catalog_entries").get()?.n, 20);
  await saveCatalog(env, cookie, { kind: "category", slug: "nested-demo" });
  assert.equal((await catalogSave({ env, request: request("/api/admin/catalog/save", "POST", catalogInput({ kind: "category", slug: "nested-demo" }), cookie) })).status, 409);
});

test("public catalog entries require descriptions and channels need ready, owned image records", async (t) => {
  const { env, cookie } = await setup(); t.after(() => env.DB.sqlite.close());
  const good = await image(env), pending = await image(env, "pending"), video = await image(env, "ready", "video/mp4");
  for (const fields of [{ status: "published" }, { status: "published", description: "A real introduction." }, { status: "published", description: "A real introduction.", photoAssetId: pending }, { status: "published", description: "A real introduction.", photoAssetId: video }]) assert.equal((await catalogSave({ env, request: request("/api/admin/catalog/save", "POST", catalogInput(fields), cookie) })).status, 400);
  const published = await saveCatalog(env, cookie, { status: "published", description: "A real introduction.", photoAssetId: good }); assert.equal(published.status, "published"); assert.match(published.imageUrl!, /^https:\/\/assets.example.test\/media\/images/);
  const category = await saveCatalog(env, cookie, { kind: "category", status: "published", slug: "new-topic", description: "A new approved topic." }); assert.equal(category.photoAssetId, null);
});

test("catalog validation rejects HTML, invalid values and oversized requests", async (t) => {
  const { env, cookie } = await setup(); t.after(() => env.DB.sqlite.close());
  for (const fields of [{ kind: "video" }, { slug: "bad--slug" }, { slug: "UPPER" }, { name: "" }, { description: "<script>x</script>" }, { name: "a".repeat(101) }, { imageAlt: "a".repeat(161) }, { status: "live" }, { photoAssetId: "not-uuid" }, { id: "malformed" }]) assert.equal((await catalogSave({ env, request: request("/api/admin/catalog/save", "POST", catalogInput(fields), cookie) })).status, 400);
  assert.equal((await catalogSave({ env, request: request("/api/admin/catalog/save", "POST", catalogInput({ description: "x".repeat(70000) }), cookie) })).status, 413);
});

test("catalog filters are literal, paginated, sorted and reflected in real admin totals", async (t) => {
  const { env, cookie } = await setup(); t.after(() => env.DB.sqlite.close());
  for (let index = 0; index < 15; index++) await saveCatalog(env, cookie, { name: `Draft ${index}`, slug: `draft-${index}` });
  await saveCatalog(env, cookie, { name: "100%_literal", slug: "literal-query" });
  const list = async (query: string) => { const response = await catalogGet({ env, request: request(`/api/admin/catalog/?kind=channel&${query}`, "GET", undefined, cookie) }); assert.equal(response.status, 200); return await response.json() as CatalogList; };
  const first = await list("status=draft"); assert.equal(first.total, 16); assert.equal(first.entries.length, 12); assert.equal(first.totalPages, 2);
  assert.equal((await list("status=draft&page=2")).entries.length, 4); assert.equal((await list("q=%25_")).total, 1);
  assert.equal((await list("q='OR1%3D1--")).total, 0);
  const totals = await metrics({ env, request: request("/api/admin/metrics", "GET", undefined, cookie) }); const data = await totals.json() as { totalChannels: number; totalCategories: number }; assert.equal(data.totalChannels, 26); assert.equal(data.totalCategories, 10);
});

test("settings persist safe fields with optimistic concurrency and readable colors", async (t) => {
  const { env, cookie } = await setup(); t.after(() => env.DB.sqlite.close()); const original = await getSettings(env, cookie);
  const settings = { ...original.settings, brandName: "QA Brand", siteUrl: "https://catalog.example.test/", publicEmail: "public@example.test", googleVerification: "public-verification-token-1234", theme: THEME_PRESETS[1].colors };
  const response = await settingsSave({ env, request: request("/api/admin/settings", "POST", { settings, revision: original.revision }, cookie) }); assert.equal(response.status, 200);
  const updated = await response.json() as SettingsRecord; assert.equal(updated.revision, 2); assert.equal(updated.settings.siteUrl, "https://catalog.example.test"); assert.equal(updated.settings.brandName, "QA Brand");
  assert.equal((await settingsSave({ env, request: request("/api/admin/settings", "POST", { settings, revision: 1 }, cookie) })).status, 409);
  assert.equal((await getSettings(env, cookie)).settings.googleVerification, settings.googleVerification);
});

test("settings reject secret-like tag markup, unsafe origins, HTML, bad emails and low contrast", async (t) => {
  const { env, cookie } = await setup(); t.after(() => env.DB.sqlite.close());
  const bad = [{ brandName: "<b>Site</b>" }, { siteUrl: "http://example.test" }, { siteUrl: "https://secret@example.test" }, { siteUrl: "https://example.test/path" }, { siteUrl: "https://example.test?key=secret" }, { siteUrl: "https://localhost" }, { publicEmail: "not-an-email" }, { googleVerification: '<meta name="google-site-verification" content="abc" />' }, { indexSite: "true" }, { theme: { ...DEFAULT_SITE_SETTINGS.theme, text: "#222222" } }, { theme: { ...DEFAULT_SITE_SETTINGS.theme, accent: "#17151b" } }, { theme: { ...DEFAULT_SITE_SETTINGS.theme, accent: "url(javascript:alert(1))" } }];
  for (const fields of bad) assert.equal((await settingsSave({ env, request: request("/api/admin/settings", "POST", { settings: { ...DEFAULT_SITE_SETTINGS, ...fields }, revision: 1 }, cookie) })).status, 400, JSON.stringify(fields));
  assert.equal((await settingsSave({ env, request: request("/api/admin/settings", "POST", { settings: { ...DEFAULT_SITE_SETTINGS, tagline: "x".repeat(20000) }, revision: 1 }, cookie) })).status, 413);
});

test("pages remain private drafts until starter copy is replaced and explicit review is recorded", async (t) => {
  const { env, cookie } = await setup(); t.after(() => env.DB.sqlite.close()); const pages = await getPages(env, cookie), about = pages.find((page) => page.slug === "about")!;
  assert.equal((await pagesSave({ env, request: request("/api/admin/pages/save", "POST", { ...about, status: "published", reviewConfirmed: true }, cookie) })).status, 400);
  const reviewed = { ...about, body: "This is our reviewed, accurate introduction.", status: "published", reviewConfirmed: true, noindex: false };
  const response = await pagesSave({ env, request: request("/api/admin/pages/save", "POST", reviewed, cookie) }); assert.equal(response.status, 200);
  const updated = (await response.json() as { page: InformationPage }).page; assert.equal(updated.revision, 2); assert.equal(updated.status, "published"); assert.equal(updated.noindex, false);
  assert.equal((await pagesSave({ env, request: request("/api/admin/pages/save", "POST", reviewed, cookie) })).status, 409);
  const archived = await pagesSave({ env, request: request("/api/admin/pages/save", "POST", { ...updated, status: "draft" }, cookie) }); assert.equal(archived.status, 200);
  const terms = pages.find((page) => page.slug === "terms")!;
  assert.equal((await pagesSave({ env, request: request("/api/admin/pages/save", "POST", { ...terms, body: "<img src=x onerror=alert(1)>" }, cookie) })).status, 400);
});

test("contact and removal pages require a monitored public address, never a fake success form", async (t) => {
  const { env, cookie } = await setup(); t.after(() => env.DB.sqlite.close()); const pages = await getPages(env, cookie);
  for (const slug of ["contact", "content-removal"]) { const page = pages.find((page) => page.slug === slug)!;
    assert.equal((await pagesSave({ env, request: request("/api/admin/pages/save", "POST", { ...page, body: "Send us the exact page URL and a safe way to reply.", status: "published", reviewConfirmed: true }, cookie) })).status, 400); }
  const record = await getSettings(env, cookie);
  assert.equal((await settingsSave({ env, request: request("/api/admin/settings", "POST", { ...record, settings: { ...record.settings, publicEmail: "contact@example.test", removalEmail: "reports@example.test" } }, cookie) })).status, 200);
  for (const slug of ["contact", "content-removal"]) { const page = pages.find((page) => page.slug === slug)!;
    assert.equal((await pagesSave({ env, request: request("/api/admin/pages/save", "POST", { ...page, body: "Send us the exact page URL and a safe way to reply.", status: "published", reviewConfirmed: true }, cookie) })).status, 200); }
});

test("all publish routes share one rate limit and queue rather than claim live deployment", async (t) => {
  const { env, cookie } = await setup(); t.after(() => env.DB.sqlite.close()); env.D1_DATABASE_ID = randomUUID(); env.D1_READ_TOKEN = "fixture-private-read-token"; env.PAGES_DEPLOY_HOOK = "https://api.cloudflare.com/client/v4/pages/webhooks/deploy_hooks/private-qa-only";
  const previous = globalThis.fetch; let calls = 0;
  globalThis.fetch = (async (url, options) => { calls++; assert.equal(url, env.PAGES_DEPLOY_HOOK); assert.equal(options?.redirect, "error"); assert.equal(options?.method, "POST"); return Response.json({ success: true }); }) as typeof fetch; t.after(() => { globalThis.fetch = previous; });
  for (const handler of [publish, legacyPublish, publish]) { const response = await handler({ env, request: request("/api/admin/publish", "POST", undefined, cookie) }); assert.equal(response.status, 202); const text = await response.text(); assert.match(text, /not live yet/); assert.ok(!text.includes(env.PAGES_DEPLOY_HOOK)); }
  const limited = await legacyPublish({ env, request: request("/api/admin/models/publish", "POST", undefined, cookie) }); assert.equal(limited.status, 429); assert.ok(Number(limited.headers.get("retry-after")) > 0); assert.equal(calls, 3);
});

test("palette utilities support readable dark/light themes and safe non-Latin fallback slugs", () => {
  for (const preset of THEME_PRESETS) { assert.deepEqual(validateSiteSettings({ ...DEFAULT_SITE_SETTINGS, theme: preset.colors }).theme, preset.colors); assert.ok(contrastRatio(preset.colors.text, preset.colors.background) >= 4.5); assert.ok(contrastRatio(preset.colors.accent, accentText(preset.colors.accent)) >= 4.5); }
  const light = { accent: "#75395b", background: "#ffffff", surface: "#f1eeee", text: "#111111" }; assert.deepEqual(validateSiteSettings({ ...DEFAULT_SITE_SETTINGS, theme: light }).theme, light); assert.equal(siteThemeStyle(light).colorScheme, "light");
  assert.equal(catalogSlug("নাম", "model", "abcd1234"), "model-abcd1234"); assert.equal(catalogSlug("A New Channel", "channel", "ignored"), "a-new-channel");
});

test("derived palette labels and button states retain readable contrast, including threshold colors", () => {
  for (const theme of [...THEME_PRESETS.map((preset) => preset.colors),
    { accent: "#777777", background: "#ffffff", surface: "#ffffff", text: "#767676" },
    { accent: "#75395b", background: "#ffffff", surface: "#f1eeee", text: "#111111" }]) {
    validateSiteSettings({ ...DEFAULT_SITE_SETTINGS, theme });
    const style = siteThemeStyle(theme);
    for (const key of ["--muted", "--soft-muted", "--accent-bright"]) for (const background of [theme.background, theme.surface]) assert.ok(contrastRatio(style[key], background) >= 4.5, `${key} on ${background}`);
    assert.ok(contrastRatio(style["--accent"], style["--accent-text"]) >= 4.5);
    assert.ok(contrastRatio(style["--accent-hover"], style["--accent-hover-text"]) >= 4.5);
  }
});

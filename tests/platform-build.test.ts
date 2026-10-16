import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { buildModelSnapshot } from "../lib/model-build";
import { buildPlatformSnapshot, platformReader } from "../lib/platform-build";
import type { ModelBuildEnv } from "../lib/model-build";
import { DEFAULT_SITE_SETTINGS } from "../lib/platform";
import { platformSnapshotArtifacts } from "../scripts/platform-snapshot-artifacts.mjs";
import { LocalD1 } from "./helpers/local-d1";
const env: ModelBuildEnv = { R2_ACCOUNT_ID: "a".repeat(32), D1_DATABASE_ID: "9c759492-15d3-4ac3-8247-0028dd18a8f5", D1_READ_TOKEN: "private-build-token-do-not-export", R2_PUBLIC_BASE_URL: "https://assets.example.test" };
function fetcher(db: LocalD1, observer?: (sql: string) => void): typeof fetch {
  return (async (url, options) => {
    assert.equal(String(url), `https://api.cloudflare.com/client/v4/accounts/${env.R2_ACCOUNT_ID}/d1/database/${env.D1_DATABASE_ID}/query`);
    assert.equal(new Headers(options?.headers).get("authorization"), `Bearer ${env.D1_READ_TOKEN}`);
    const { sql, params } = JSON.parse(String(options?.body)) as { sql: string; params: Array<string | number> };
    assert.match(sql.trim(), /^SELECT/i); const rows = db.sqlite.prepare(sql).all(...params); observer?.(sql);
    return Response.json({ success: true, result: [{ success: true, results: rows }] });
  }) as typeof fetch;
}
async function image(db: LocalD1, status = "ready") {
  const id = randomUUID(); await db.prepare("INSERT OR IGNORE INTO admin_users (email, password_salt, password_hash) VALUES ('owner-build@example.test','s','h')").run();
  const key = `media/images/channel-photo/2026/10/${id}.jpg`;
  await db.prepare(`INSERT INTO media_assets (id, object_key, purpose, original_filename, content_type, size_bytes, width, height, status, uploader_email, upload_expires_at)
    VALUES (?, ?, 'channel-photo', 'channel.jpg', 'image/jpeg', 256, 640, 800, ?, 'owner-build@example.test', '2026-10-16T20:00:00.000Z')`).bind(id, key, status).run(); return { id, key };
}
async function entry(db: LocalD1, kind = "category", extra: { slug?: string; status?: string; photo?: string | null } = {}) {
  const id = randomUUID(), slug = extra.slug ?? `export-${id}`;
  await db.prepare(`INSERT INTO catalog_entries (id, kind, slug, name, description, photo_asset_id, status, source, created_at, updated_at)
    VALUES (?, ?, ?, 'Published fixture name', 'An original, verified catalog introduction.', ?, ?, 'admin', '2026-10-16T12:00:00.000Z', '2026-10-16T12:00:00.000Z')`).bind(id, kind, slug, extra.photo ?? null, extra.status ?? "published").run();
  if (kind === "channel") await db.prepare("INSERT INTO content_slugs (slug, entity_type, entity_id) VALUES (?, 'channel', ?)").bind(slug, id).run(); return id;
}

test("platform fallback makes no API calls only when publishing settings are entirely absent", async () => {
  let calls = 0; const blocked = (async () => { calls++; throw new Error("No network"); }) as typeof fetch;
  const result = await buildPlatformSnapshot({}, blocked); assert.equal(result.source, "demo"); assert.deepEqual(result.entries, []); assert.deepEqual(result.pages, []); assert.equal(calls, 0);
  for (const partial of [{ D1_DATABASE_ID: env.D1_DATABASE_ID }, { D1_READ_TOKEN: "fixture" }, { ...env, R2_ACCOUNT_ID: "invalid" }]) await assert.rejects(buildPlatformSnapshot(partial, blocked), /Incomplete static workspace/);
});

test("workspace export includes only public catalog, reviewed public pages and public settings", async (t) => {
  const db = new LocalD1(true, true); t.after(() => db.sqlite.close()); const photo = await image(db), id = await entry(db, "channel", { slug: "published-channel", photo: photo.id });
  await entry(db, "category", { slug: "secret-draft-category", status: "draft" }); await entry(db, "channel", { slug: "secret-archived-channel", status: "archived" });
  db.sqlite.exec("UPDATE site_pages SET body = 'PRIVATE DRAFT BODY THAT MUST NOT SHIP' WHERE slug = 'privacy'");
  db.sqlite.exec("UPDATE site_pages SET status = 'published', review_confirmed = 1, body = 'An accurate public introduction.', noindex = 0 WHERE slug = 'about'");
  db.sqlite.exec("UPDATE site_pages SET status = 'published', review_confirmed = 0, body = 'UNREVIEWED BODY MUST NOT SHIP' WHERE slug = 'terms'");
  const snapshot = await buildPlatformSnapshot(env, fetcher(db)); assert.equal(snapshot.source, "d1"); assert.ok(snapshot.builtAt); assert.equal(snapshot.entries.length, 21); assert.equal(snapshot.pages.length, 1);
  assert.equal(snapshot.entries.find((item) => item.id === id)?.imageUrl, `${env.R2_PUBLIC_BASE_URL}/${photo.key}`); assert.equal(snapshot.settings.brandName, "Vidubuzz"); assert.equal(snapshot.pages[0].slug, "about");
  for (const privateValue of ["PRIVATE DRAFT BODY", "UNREVIEWED BODY", "secret-draft-category", "secret-archived-channel", env.D1_READ_TOKEN!, "owner-build@example.test", "photoAssetId", "createdBy"]) assert.ok(!JSON.stringify(snapshot).includes(privateValue), privateValue);
  const artifacts = platformSnapshotArtifacts(snapshot);
  assert.ok(!JSON.stringify(artifacts["platform-index.json"]).includes("original, verified")); assert.ok(!JSON.stringify(artifacts["platform-index.json"]).includes("accurate public introduction"));
  assert.ok(!JSON.stringify(artifacts["platform-meta.json"]).includes("Published fixture name")); assert.ok(JSON.stringify(artifacts["platform-meta.json"]).includes("published-channel"));
});

test("an empty configured public selection stays empty rather than restoring demos", async (t) => {
  const db = new LocalD1(true, true); t.after(() => db.sqlite.close()); db.sqlite.exec("UPDATE catalog_entries SET status = 'archived', revision = revision + 1");
  const snapshot = await buildPlatformSnapshot(env, fetcher(db)); assert.equal(snapshot.source, "d1"); assert.equal(snapshot.entries.length, 0); assert.equal(snapshot.pages.length, 0);
});

test("catalog export paginates beyond 200 entries, including photo-optional categories", async (t) => {
  const db = new LocalD1(true, true); t.after(() => db.sqlite.close()); for (let index = 0; index < 201; index++) await entry(db, "category", { slug: `topic-${index}` });
  let pages = 0; const result = await buildPlatformSnapshot(env, fetcher(db, (sql) => { if (sql.includes("LIMIT ? OFFSET ?")) pages++; }));
  assert.equal(result.entries.length, 221); assert.equal(pages, 2); assert.equal(result.entries.find((item) => item.slug === "topic-200")?.imageUrl, "/media/category-placeholder.svg");
});

test("missing migration and invalid D1 JSON/API responses fail closed without private body leakage", async (t) => {
  const db = new LocalD1(true, true, false); t.after(() => db.sqlite.close()); await assert.rejects(buildPlatformSnapshot(env, fetcher(db)), /Workspace snapshot request failed/);
  for (const response of [new Response(`private ${env.D1_READ_TOKEN}`, { status: 403 }), new Response(`private ${env.D1_READ_TOKEN}`, { status: 200 }), Response.json({ success: true, result: [] }), Response.json({ success: false })]) {
    await assert.rejects(buildPlatformSnapshot(env, (async () => response) as typeof fetch), (error: Error) => { assert.ok(!error.message.includes(env.D1_READ_TOKEN!)); return true; });
  }
});

test("public managed channels without verified images fail closed", async (t) => {
  const missing = new LocalD1(true, true); t.after(() => missing.sqlite.close()); await entry(missing, "channel", { slug: "missing-photo" }); await assert.rejects(buildPlatformSnapshot(env, fetcher(missing)), /verified R2 photo/);
  const pending = new LocalD1(true, true); t.after(() => pending.sqlite.close()); const photo = await image(pending, "pending"); await entry(pending, "channel", { photo: photo.id }); await assert.rejects(buildPlatformSnapshot(env, fetcher(pending)), /missing or unverified/);
});

test("published photos reject private endpoints, paths, query secrets and HTTP origins", async (t) => {
  const db = new LocalD1(true, true); t.after(() => db.sqlite.close()); const photo = await image(db); await entry(db, "channel", { photo: photo.id });
  for (const origin of [undefined, "http://assets.test", "https://private.r2.cloudflarestorage.com", "https://secret@assets.test", "https://assets.test/bucket", "https://assets.test?token=secret"]) await assert.rejects(buildPlatformSnapshot({ ...env, R2_PUBLIC_BASE_URL: origin }, fetcher(db)), /public HTTPS/);
});

test("unreviewed legal starter text and incomplete published reporting pages cannot leak into a build", async (t) => {
  const db = new LocalD1(true, true); t.after(() => db.sqlite.close()); db.sqlite.exec("UPDATE site_pages SET status = 'published', review_confirmed = 1 WHERE slug = 'privacy'");
  await assert.rejects(buildPlatformSnapshot(env, fetcher(db)), /Unreviewed policy/);
  db.sqlite.exec("UPDATE site_pages SET status = 'draft' WHERE slug = 'privacy'"); db.sqlite.exec("UPDATE site_pages SET status = 'published', review_confirmed = 1, body = 'A reviewed contact process.' WHERE slug = 'contact'");
  await assert.rejects(buildPlatformSnapshot(env, fetcher(db)), /monitored public email/);
});

test("invalid stored settings and broken channel/system slug ownership fail the build", async (t) => {
  const db = new LocalD1(true, true); t.after(() => db.sqlite.close());
  await db.prepare("UPDATE site_settings SET settings_json = ? WHERE id = 1").bind(JSON.stringify({ ...DEFAULT_SITE_SETTINGS, theme: { ...DEFAULT_SITE_SETTINGS.theme, text: "#222222" } })).run();
  await assert.rejects(buildPlatformSnapshot(env, fetcher(db)), /contrast/);
  await db.prepare("UPDATE site_settings SET settings_json = ? WHERE id = 1").bind(JSON.stringify(DEFAULT_SITE_SETTINGS)).run();
  db.sqlite.exec("UPDATE content_slugs SET entity_id = 'wrong-owner' WHERE slug = 'velvet-room'"); await assert.rejects(buildPlatformSnapshot(env, fetcher(db)), /slug ownership/);
  db.sqlite.exec("UPDATE content_slugs SET entity_id = 'demo-channel-velvet-room' WHERE slug = 'velvet-room'"); db.sqlite.exec("DELETE FROM content_slugs WHERE slug = 'about'"); await assert.rejects(buildPlatformSnapshot(env, fetcher(db)), /information-page URL/);
});

test("catalog/settings/pages/model changes during export are detected by the site fingerprint", async (t) => {
  for (const sql of ["UPDATE catalog_entries SET revision = revision + 1 WHERE slug = 'velvet-room'", "UPDATE site_settings SET revision = revision + 1 WHERE id = 1", "UPDATE site_pages SET revision = revision + 1 WHERE slug = 'about'", "UPDATE models SET revision = revision + 1 WHERE slug = 'maya-sol'"]) {
    const db = new LocalD1(true, true); t.after(() => db.sqlite.close()); let changed = false;
    await assert.rejects(buildPlatformSnapshot(env, fetcher(db, (query) => { if (query.includes("LIMIT ? OFFSET ?") && !changed) { changed = true; db.sqlite.exec(sql); } })), /changed while building/);
  }
});

test("snapshot SELECT queries use the existing account/database endpoint", async (t) => {
  const db = new LocalD1(true, true); t.after(() => db.sqlite.close()); const query = platformReader(env, fetcher(db));
  const rows = await query<{ n: number }>("SELECT COUNT(*) AS n FROM catalog_entries"); assert.equal(rows[0].n, 20);
});


test("build network/header exceptions cannot echo private read tokens into logs", async () => {
  const failing = (async () => { throw new TypeError(`Invalid header Bearer ${env.D1_READ_TOKEN}`); }) as typeof fetch;
  for (const build of [buildModelSnapshot, buildPlatformSnapshot]) {
    await assert.rejects(build(env, failing), (error: Error) => {
      assert.match(error.message, /request failed or timed out/);
      assert.ok(!error.message.includes(env.D1_READ_TOKEN!));
      return true;
    });
  }
});

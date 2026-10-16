import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { buildModelSnapshot, type ModelBuildEnv } from "../lib/model-build";
import { LocalD1 } from "./helpers/local-d1";
import { modelSnapshotArtifacts } from "../scripts/model-snapshot-artifacts.mjs";

const env: ModelBuildEnv = { R2_ACCOUNT_ID: "a".repeat(32), D1_DATABASE_ID: "b332679c-a0e5-4ad8-bf1f-a0a7dcd6c2d1",
  D1_READ_TOKEN: "private-read-fixture-not-real", R2_PUBLIC_BASE_URL: "https://assets.example.test" };
function d1Fetcher(db: LocalD1, observer?: (sql: string, params: Array<string | number>) => void): typeof fetch {
  return (async (url: string | URL | Request, options?: RequestInit) => {
    assert.equal(String(url), `https://api.cloudflare.com/client/v4/accounts/${env.R2_ACCOUNT_ID}/d1/database/${env.D1_DATABASE_ID}/query`);
    assert.equal(options?.method, "POST"); assert.equal(new Headers(options?.headers).get("authorization"), `Bearer ${env.D1_READ_TOKEN}`);
    const body = JSON.parse(String(options?.body)) as { sql: string; params: Array<string | number> };
    const rows = db.sqlite.prepare(body.sql).all(...body.params); observer?.(body.sql, body.params);
    return Response.json({ success: true, result: [{ success: true, results: rows }] });
  }) as typeof fetch;
}
async function image(db: LocalD1, type = "image/jpeg", status = "ready") {
  const id = randomUUID();
  const key = `media/images/model-photo/2026/10/${id}.jpg`;
  await db.prepare("INSERT OR IGNORE INTO admin_users (email, password_salt, password_hash) VALUES ('build-admin@example.test', 's', 'h')").run();
  await db.prepare(`INSERT INTO media_assets (id, object_key, purpose, original_filename, content_type, size_bytes, width, height,
    status, uploader_email, upload_expires_at) VALUES (?, ?, 'model-photo', 'photo.jpg', ?, 256, 640, 800, ?, 'build-admin@example.test', '2026-10-16T10:10:00.000Z')`)
    .bind(id, key, type, status).run(); return { id, key };
}
async function model(db: LocalD1, photo: string | null, extra: { slug?: string; status?: string; adult?: number; age?: number | null; country?: string | null; source?: string } = {}) {
  const id = randomUUID();
  await db.prepare(`INSERT INTO models (id, slug, name, country_code, age, description, seo_title, meta_description, image_alt,
    photo_asset_id, adult_confirmed, status, source, created_at, updated_at) VALUES (?, ?, 'Test Model', ?, ?, 'A helpful original biography.',
    'A custom search title', 'A custom snippet', 'A descriptive portrait', ?, ?, ?, ?, '2026-10-16T10:00:00.000Z', '2026-10-16T10:00:00.000Z')`)
    .bind(id, extra.slug ?? `test-${id}`, extra.country ?? null, extra.age ?? null, photo, extra.adult ?? 1, extra.status ?? "published", extra.source ?? "admin").run();
  return id;
}

test("builds retain the existing demo catalog only when D1 publishing is wholly unset", async () => {
  let called = false; const fetcher = (async () => { called = true; throw new Error("Should not call API"); }) as typeof fetch;
  assert.deepEqual(await buildModelSnapshot({ R2_ACCOUNT_ID: env.R2_ACCOUNT_ID }, fetcher), { version: 1, source: "demo", builtAt: null, models: [] }); assert.equal(called, false);
  for (const partial of [{ D1_DATABASE_ID: env.D1_DATABASE_ID }, { D1_READ_TOKEN: "fixture" }, { ...env, R2_ACCOUNT_ID: "invalid" }]) await assert.rejects(buildModelSnapshot(partial, fetcher), /Incomplete model build settings/);
});

test("D1 snapshot exports published adult-confirmed profiles and ready photos, never drafts, owners or credentials", async (t) => {
  const db = new LocalD1(true, true); t.after(() => db.sqlite.close()); const photo = await image(db);
  const id = await model(db, photo.id, { slug: "published-model", age: 24, country: "BD" });
  await model(db, null, { slug: "secret-draft", status: "draft" }); await model(db, photo.id, { slug: "archived-model", status: "archived" }); await model(db, photo.id, { slug: "unconfirmed-model", adult: 0 });
  const snapshot = await buildModelSnapshot(env, d1Fetcher(db)); assert.equal(snapshot.source, "d1"); assert.ok(snapshot.builtAt); assert.equal(snapshot.models.length, 7);
  const published = snapshot.models.find((item) => item.id === id)!; assert.equal(published.imageUrl, `${env.R2_PUBLIC_BASE_URL}/${photo.key}`); assert.equal(published.age, 24); assert.equal(published.countryCode, "BD"); assert.equal(published.seoTitle, "A custom search title");
  const artifacts = modelSnapshotArtifacts(snapshot);
  assert.ok(!JSON.stringify(artifacts["model-index.json"]).includes("A helpful original biography"));
  assert.ok(!JSON.stringify(artifacts["model-index.json"]).includes("custom search title"));
  assert.ok(!JSON.stringify(artifacts["model-meta.json"]).includes("Test Model"));
  assert.ok(JSON.stringify(artifacts["model-meta.json"]).includes("published-model"));
  const serialized = JSON.stringify(snapshot); for (const privateValue of [env.D1_READ_TOKEN!, "build-admin@example.test", "secret-draft", "archived-model", "unconfirmed-model", "photoAssetId", "createdBy"]) assert.ok(!serialized.includes(privateValue), privateValue);
  assert.ok(snapshot.models.filter((item) => item.source === "demo").every((item) => item.age === null && item.countryCode === null && item.imageUrl.startsWith("/media/")));
});

test("an empty managed public selection stays empty and never silently restores demo profiles", async (t) => {
  const db = new LocalD1(true, true); t.after(() => db.sqlite.close()); await db.prepare("UPDATE models SET status = 'archived', revision = revision + 1").run();
  const snapshot = await buildModelSnapshot(env, d1Fetcher(db)); assert.equal(snapshot.source, "d1"); assert.equal(snapshot.models.length, 0);
});

test("snapshot loading paginates beyond the first 200 records without truncation", async (t) => {
  const db = new LocalD1(true, true); t.after(() => db.sqlite.close()); const photo = await image(db);
  for (let index = 0; index < 201; index++) await model(db, photo.id, { slug: `model-${index}` });
  const pages: number[] = [];
  const snapshot = await buildModelSnapshot(env, d1Fetcher(db, (sql, params) => { if (sql.includes("LIMIT ? OFFSET ?")) pages.push(Number(params[1])); }));
  assert.equal(snapshot.models.length, 207); assert.deepEqual(pages, [0, 200]); assert.equal(new Set(snapshot.models.map((item) => item.slug)).size, 207);
});

test("read-token/REST errors fail the build closed without echoing private response bodies", async () => {
  const denied = (async () => new Response(`private response with ${env.D1_READ_TOKEN}`, { status: 403 })) as typeof fetch;
  await assert.rejects(buildModelSnapshot(env, denied), (error: Error) => { assert.ok(error.message.includes("403")); assert.ok(!error.message.includes(env.D1_READ_TOKEN!)); return true; });
  for (const result of [{ success: false }, { success: true, result: [{ success: false, results: [] }] }, { success: true, result: [] }]) await assert.rejects(buildModelSnapshot(env, (async () => Response.json(result)) as typeof fetch), /valid model snapshot/);
});

test("managed public profiles without verified image references abort the build", async (t) => {
  for (const [type, status] of [["image/jpeg", "pending"], ["video/mp4", "ready"]]) {
    const db = new LocalD1(true, true); t.after(() => db.sqlite.close()); const photo = await image(db, type, status); await model(db, photo.id);
    await assert.rejects(buildModelSnapshot(env, d1Fetcher(db)), /not a verified R2 image/);
  }
  const db = new LocalD1(true, true); t.after(() => db.sqlite.close()); await model(db, null);
  await assert.rejects(buildModelSnapshot(env, d1Fetcher(db)), /verified R2 thumbnail/);
});

test("build-time photo origins reject private S3 endpoints, HTTP, credentials, paths and query secrets", async (t) => {
  const db = new LocalD1(true, true); t.after(() => db.sqlite.close()); const photo = await image(db); await model(db, photo.id);
  for (const value of [undefined, "http://assets.test", "https://a.r2.cloudflarestorage.com", "https://secret@assets.test", "https://assets.test/bucket", "https://assets.test?token=secret"]) await assert.rejects(buildModelSnapshot({ ...env, R2_PUBLIC_BASE_URL: value }, d1Fetcher(db)), /public HTTPS|R2_PUBLIC_BASE_URL/);
});

test("invalid published model facts and duplicate slugs fail closed", async (t) => {
  const db = new LocalD1(true, true); t.after(() => db.sqlite.close()); const photo = await image(db);
  const id = await model(db, photo.id, { country: "XX" }); await assert.rejects(buildModelSnapshot(env, d1Fetcher(db)), /Invalid\/duplicate/);
  await db.prepare("UPDATE models SET country_code = NULL, slug = 'bad--slug' WHERE id = ?").bind(id).run(); await assert.rejects(buildModelSnapshot(env, d1Fetcher(db)), /Invalid\/duplicate/);
  await db.prepare("UPDATE models SET slug = 'valid-slug' WHERE id = ?").bind(id).run();
  const duplicateFetcher = (async (_url: string | URL | Request, options?: RequestInit) => {
    const body = JSON.parse(String(options?.body)) as { sql: string; params: number[] }; const rows = db.sqlite.prepare(body.sql).all(...body.params);
    if (body.sql.includes("LIMIT ? OFFSET ?") && rows.length) rows.push(rows[0]);
    return Response.json({ success: true, result: [{ success: true, results: rows }] });
  }) as typeof fetch;
  await assert.rejects(buildModelSnapshot(env, duplicateFetcher), /Invalid\/duplicate/);
});

test("saving during snapshot generation aborts rather than publishing a mixed catalog", async (t) => {
  const db = new LocalD1(true, true); t.after(() => db.sqlite.close()); let changed = false;
  await assert.rejects(buildModelSnapshot(env, d1Fetcher(db, (sql) => {
    if (sql.includes("LIMIT ? OFFSET ?") && !changed) { changed = true; db.sqlite.exec("UPDATE models SET revision = revision + 1 WHERE slug = 'maya-sol'"); }
  })), /changed while the snapshot/);
});

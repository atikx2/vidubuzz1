import assert from "node:assert/strict";
import { createHash, createHmac, randomUUID } from "node:crypto";
import test from "node:test";
import { sessionCookie } from "../functions/_shared/admin-auth";
import { signatureMatches, type MediaBucket, type MediaEnv, type MediaRow, type R2ObjectMetadata } from "../functions/_shared/r2-media";
import { onRequestGet as config } from "../functions/api/admin/media/config";
import { onRequestPost as presign } from "../functions/api/admin/media/presign";
import { onRequestPost as complete } from "../functions/api/admin/media/complete";
import { onRequestGet as library } from "../functions/api/admin/media/index";
import { IMAGE_MAX_BYTES, PREVIEW_MAX_BYTES, type MediaAsset, type PresignedUpload, type UploadIntent } from "../lib/media-assets";
import { LocalD1 } from "./helpers/local-d1";

const email = "media-admin@example.test";
const origin = "https://vidubuzz.test";
const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82]);

class LocalR2 implements MediaBucket {
  files = new Map<string, { meta: R2ObjectMetadata; bytes: Uint8Array }>();
  heads: string[] = [];
  reads: Array<{ key: string; offset: number; length: number }> = [];
  deletes: string[] = [];
  async head(key: string) { this.heads.push(key); return this.files.get(key)?.meta ?? null; }
  async get(key: string, options: { range: { offset: number; length: number } }) {
    this.reads.push({ key, ...options.range });
    const file = this.files.get(key);
    if (!file) return null;
    return { ...file.meta, arrayBuffer: async () => new Uint8Array(file.bytes.slice(options.range.offset, options.range.offset + options.range.length)).buffer };
  }
  async delete(key: string) { this.deletes.push(key); this.files.delete(key); }
}

type Env = MediaEnv & { DB: LocalD1; ASSETS_BUCKET: LocalR2 };
async function setup(media = true) {
  const env: Env = {
    DB: new LocalD1(media), ASSETS_BUCKET: new LocalR2(), ADMIN_EMAIL: email,
    ADMIN_PASSWORD_PEPPER: "fixture-pepper-for-media-only-fb2188cc68e7",
    ADMIN_SESSION_SECRET: "fixture-session-different-secret-4a1182fcba42",
    R2_ACCOUNT_ID: "a".repeat(32), R2_BUCKET_NAME: "test-assets",
    R2_PUBLIC_BASE_URL: "https://assets.example.test",
    R2_ACCESS_KEY_ID: "fixture-r2-access-key-not-a-real-key",
    R2_SECRET_ACCESS_KEY: "fixture-r2-secret-not-a-production-credential-52dc44332",
  };
  await env.DB.prepare("INSERT INTO admin_users (email, password_salt, password_hash) VALUES (?, 'fixture-salt', 'fixture-hash')").bind(email).run();
  const cookie = (await sessionCookie(email, 1, env)).split(";")[0];
  return { env, cookie };
}

function request(path: string, method = "GET", body?: unknown, cookie?: string, requestOrigin = origin) {
  const headers = new Headers({ origin: requestOrigin, "content-type": "application/json" });
  if (cookie) headers.set("cookie", cookie);
  return new Request(origin + path, { method, headers, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
}
function intent(extra: Record<string, unknown> = {}): UploadIntent {
  return { purpose: "thumbnail", filename: "sample.png", contentType: "image/png", size: 128, width: 360, height: 203, ...extra } as UploadIntent;
}
async function prepare(env: Env, cookie: string, body = intent()) {
  const response = await presign({ env, request: request("/api/admin/media/presign", "POST", body, cookie) });
  assert.equal(response.status, 201, await response.clone().text());
  return await response.json() as PresignedUpload;
}
async function finalize(env: Env, cookie: string, id: string) {
  return complete({ env, request: request("/api/admin/media/complete", "POST", { id }, cookie) });
}
async function mockPut(env: Env, upload: PresignedUpload, overrides: Partial<R2ObjectMetadata> = {}, bytes = png) {
  const row = (await env.DB.prepare("SELECT * FROM media_assets WHERE id = ?").bind(upload.id).first<MediaRow>())!;
  env.ASSETS_BUCKET.files.set(upload.key, { bytes, meta: {
    key: upload.key, size: row.size_bytes, etag: "fixture-etag", httpMetadata: { contentType: row.content_type },
    customMetadata: { "asset-id": row.id, purpose: row.purpose }, ...overrides,
  } });
}

function expectedSig(upload: PresignedUpload, size: number, secret: string, overrides: Record<string, string> = {}) {
  const url = new URL(upload.url);
  const signature = url.searchParams.get("X-Amz-Signature")!;
  url.searchParams.delete("X-Amz-Signature");
  const encode = (value: string) => encodeURIComponent(value).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
  const query = [...url.searchParams].map(([name, value]) => [encode(name), encode(value)]).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([name, value]) => `${name}=${value}`).join("&");
  const headerNames = url.searchParams.get("X-Amz-SignedHeaders")!;
  const headers: Record<string, string> = { ...upload.headers, host: url.host, "content-length": String(size), ...overrides };
  const canonicalHeaders = headerNames.split(";").map((name) => `${name}:${headers[name].replace(/\s+/g, " ")}`).join("\n");
  const canonical = ["PUT", url.pathname, query, `${canonicalHeaders}\n`, headerNames, "UNSIGNED-PAYLOAD"].join("\n");
  const scope = url.searchParams.get("X-Amz-Credential")!.split("/").slice(1).join("/");
  const dateTime = url.searchParams.get("X-Amz-Date")!;
  const stringToSign = ["AWS4-HMAC-SHA256", dateTime, scope, createHash("sha256").update(canonical).digest("hex")].join("\n");
  const hmac = (key: string | Buffer, data: string) => createHmac("sha256", key).update(data).digest();
  const key = hmac(hmac(hmac(hmac(`AWS4${secret}`, dateTime.slice(0, 8)), "auto"), "s3"), "aws4_request");
  return { signature, calculated: createHmac("sha256", key).update(stringToSign).digest("hex") };
}

test("R2 configuration stays private and reports missing setup without leaking credentials", async (t) => {
  const { env, cookie } = await setup(); t.after(() => env.DB.sqlite.close());
  const ready = await config({ env, request: request("/api/admin/media/config", "GET", undefined, cookie) });
  const text = await ready.text();
  assert.equal(ready.status, 200);
  assert.ok(!text.includes(env.R2_SECRET_ACCESS_KEY!));
  assert.ok(!text.includes(env.R2_ACCESS_KEY_ID!));
  assert.equal(JSON.parse(text).configured, true);
  const unconfigured: MediaEnv = { ...env, ASSETS_BUCKET: undefined, R2_ACCESS_KEY_ID: undefined };
  const response = await config({ env: unconfigured, request: request("/api/admin/media/config", "GET", undefined, cookie) });
  const data = await response.json() as { configured: boolean; missing: string[] };
  assert.equal(data.configured, false);
  assert.ok(data.missing.includes("ASSETS_BUCKET"));
  assert.ok(data.missing.includes("R2_ACCESS_KEY_ID"));
});

test("media migration is required and no signed URL is returned when the D1 intent cannot be stored", async (t) => {
  const { env, cookie } = await setup(false); t.after(() => env.DB.sqlite.close());
  const response = await config({ env, request: request("/api/admin/media/config", "GET", undefined, cookie) });
  const data = await response.json() as { configured: boolean; migrationApplied: boolean };
  assert.equal(data.migrationApplied, false);
  assert.equal(data.configured, false);
  const upload = await presign({ env, request: request("/api/admin/media/presign", "POST", intent(), cookie) });
  assert.equal(upload.status, 503);
  assert.ok(!(await upload.text()).includes("X-Amz-Signature"));
});

test("all media endpoints require an admin session; mutations reject cross-origin requests", async (t) => {
  const { env, cookie } = await setup(); t.after(() => env.DB.sqlite.close());
  assert.equal((await config({ env, request: request("/api/admin/media/config") })).status, 401);
  assert.equal((await library({ env, request: request("/api/admin/media/") })).status, 401);
  assert.equal((await presign({ env, request: request("/api/admin/media/presign", "POST", intent()) })).status, 401);
  assert.equal((await complete({ env, request: request("/api/admin/media/complete", "POST", { id: randomUUID() }) })).status, 401);
  assert.equal((await presign({ env, request: request("/api/admin/media/presign", "POST", intent(), cookie, "https://evil.test") })).status, 403);
  assert.equal((await complete({ env, request: request("/api/admin/media/complete", "POST", { id: randomUUID() }, cookie, "https://evil.test") })).status, 403);
});

test("presigned PUT is single-key, short-lived, independently valid SigV4 and binds size/type/metadata", async (t) => {
  const { env, cookie } = await setup(); t.after(() => env.DB.sqlite.close());
  const upload = await prepare(env, cookie);
  const url = new URL(upload.url);
  assert.equal(url.hostname, `${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`);
  assert.ok(url.pathname.startsWith(`/test-assets/media/images/thumbnail/`));
  assert.equal(url.searchParams.get("X-Amz-Expires"), "600");
  assert.equal(upload.headers["if-none-match"], "*");
  for (const name of ["host", "content-length", "content-type", "if-none-match", "x-amz-meta-asset-id", "x-amz-meta-purpose"]) assert.ok(url.searchParams.get("X-Amz-SignedHeaders")!.split(";").includes(name));
  const sig = expectedSig(upload, 128, env.R2_SECRET_ACCESS_KEY!);
  assert.equal(sig.signature, sig.calculated);
  assert.notEqual(expectedSig(upload, 129, env.R2_SECRET_ACCESS_KEY!).calculated, sig.signature);
  assert.notEqual(expectedSig(upload, 128, env.R2_SECRET_ACCESS_KEY!, { "content-type": "text/html" }).calculated, sig.signature);
  assert.ok(!upload.url.includes(env.R2_SECRET_ACCESS_KEY!));
  assert.ok(!("content-length" in upload.headers));
  assert.ok(!("authorization" in upload.headers));
  const row = (await env.DB.prepare("SELECT * FROM media_assets WHERE id = ?").bind(upload.id).first<MediaRow>())!;
  assert.equal(row.status, "pending");
  assert.equal(row.object_key, upload.key);
});

test("client-controlled object paths are ignored and filenames cannot select existing objects", async (t) => {
  const { env, cookie } = await setup(); t.after(() => env.DB.sqlite.close());
  const first = await prepare(env, cookie, intent({ filename: "../../shared-file.png", key: "existing-image", bucket: "other-bucket", url: "https://attacker.test" }));
  const second = await prepare(env, cookie, intent({ filename: "../../shared-file.png" }));
  assert.notEqual(first.key, second.key);
  assert.ok(!first.key.includes(".."));
  assert.ok(first.key.endsWith(".png"));
  assert.ok(!first.url.includes("other-bucket"));
});

test("unsupported images, oversized files, long clips, main-video purposes and malformed metadata are rejected", async (t) => {
  const { env, cookie } = await setup(); t.after(() => env.DB.sqlite.close());
  const cases = [
    { purpose: "main-video" }, { contentType: "image/svg+xml" }, { contentType: "text/html" }, { contentType: "constructor" },
    { size: IMAGE_MAX_BYTES + 1 }, { size: -1 }, { size: 1.5 }, { width: 0 }, { height: 99999 }, { width: 8000, height: 8000 },
    { purpose: "preview", contentType: "video/mp4", duration: 61 },
    { purpose: "preview", contentType: "video/mp4", duration: 30, size: PREVIEW_MAX_BYTES + 1 },
    { purpose: "preview", contentType: "video/mp4" }, { duration: 5 }, { filename: "x".repeat(161) },
  ];
  for (const extra of cases) {
    const response = await presign({ env, request: request("/api/admin/media/presign", "POST", intent(extra), cookie) });
    assert.equal(response.status, 400, await response.clone().text());
  }
  assert.equal(await env.DB.prepare("SELECT COUNT(*) AS count FROM media_assets").first<{ count: number }>().then((row) => row?.count), 0);
});

test("short-preview limits are inclusive and image/preview keys are separate", async (t) => {
  const { env, cookie } = await setup(); t.after(() => env.DB.sqlite.close());
  const image = await prepare(env, cookie, intent({ size: IMAGE_MAX_BYTES }));
  const preview = await prepare(env, cookie, intent({ purpose: "preview", contentType: "video/mp4", duration: 60, size: PREVIEW_MAX_BYTES }));
  assert.ok(image.key.includes("/images/thumbnail/"));
  assert.ok(preview.key.includes("/previews/"));
  assert.ok(preview.key.endsWith(".mp4"));
});

test("completion waits for R2 and publishes only verified uploads", async (t) => {
  const { env, cookie } = await setup(); t.after(() => env.DB.sqlite.close());
  const upload = await prepare(env, cookie);
  assert.equal((await finalize(env, cookie, upload.id)).status, 409);
  await mockPut(env, upload);
  const result = await finalize(env, cookie, upload.id);
  assert.equal(result.status, 200, await result.clone().text());
  const { asset } = await result.json() as { asset: MediaAsset };
  assert.equal(asset.key, upload.key);
  assert.equal(asset.url, `https://assets.example.test/${upload.key}`);
  assert.equal(asset.filename, "sample.png");
  assert.equal(asset.purpose, "thumbnail");
  assert.equal(asset.size, 128);
  assert.ok(env.ASSETS_BUCKET.reads.every((read) => read.offset === 0 && read.length === 512));
  const row = await env.DB.prepare("SELECT status, object_etag FROM media_assets WHERE id = ?").bind(upload.id).first<{ status: string; object_etag: string }>();
  assert.equal(row?.status, "ready");
  assert.equal(row?.object_etag, "fixture-etag");
});

test("size, MIME, upload identity, purpose, and file-signature mismatches are rejected and deleted", async (t) => {
  const { env, cookie } = await setup(); t.after(() => env.DB.sqlite.close());
  for (const mismatch of [
    { size: 129 }, { httpMetadata: { contentType: "text/html" } },
    { customMetadata: { "asset-id": "wrong", purpose: "thumbnail" } },
    { customMetadata: { "asset-id": "", purpose: "preview" } },
  ]) {
    const upload = await prepare(env, cookie);
    await mockPut(env, upload, mismatch);
    assert.equal((await finalize(env, cookie, upload.id)).status, 400);
    assert.ok(env.ASSETS_BUCKET.deletes.includes(upload.key));
    assert.equal(await env.DB.prepare("SELECT status FROM media_assets WHERE id = ?").bind(upload.id).first<{ status: string }>().then((row) => row?.status), "rejected");
    assert.equal((await finalize(env, cookie, upload.id)).status, 409);
  }
  const upload = await prepare(env, cookie);
  await mockPut(env, upload, {}, new TextEncoder().encode("<script>alert('not-an-image')</script>"));
  assert.equal((await finalize(env, cookie, upload.id)).status, 400);
  assert.ok(env.ASSETS_BUCKET.deletes.includes(upload.key));
});

test("verification is idempotent and cannot publish another uploader's intent", async (t) => {
  const { env, cookie } = await setup(); t.after(() => env.DB.sqlite.close());
  const upload = await prepare(env, cookie); await mockPut(env, upload);
  assert.equal((await finalize(env, cookie, upload.id)).status, 200);
  const reads = env.ASSETS_BUCKET.reads.length;
  assert.equal((await finalize(env, cookie, upload.id)).status, 200);
  assert.equal(env.ASSETS_BUCKET.reads.length, reads);
  await env.DB.prepare("INSERT INTO admin_users (email, password_salt, password_hash) VALUES ('other-admin@example.test', 'fixture', 'fixture')").run();
  await env.DB.prepare("UPDATE media_assets SET uploader_email = 'other-admin@example.test' WHERE id = ?").bind(upload.id).run();
  assert.equal((await finalize(env, cookie, upload.id)).status, 404);
  assert.equal((await finalize(env, cookie, randomUUID())).status, 404);
});

test("expired pending upload intents are not finalized", async (t) => {
  const { env, cookie } = await setup(); t.after(() => env.DB.sqlite.close());
  const upload = await prepare(env, cookie); await mockPut(env, upload);
  await env.DB.prepare("UPDATE media_assets SET upload_expires_at = ? WHERE id = ?").bind(new Date(Date.now() - 31 * 60_000).toISOString(), upload.id).run();
  assert.equal((await finalize(env, cookie, upload.id)).status, 410);
});

test("media library filters, paginates, and hides pending/rejected/other-user records", async (t) => {
  const { env, cookie } = await setup(); t.after(() => env.DB.sqlite.close());
  const upload = await prepare(env, cookie); await mockPut(env, upload); await finalize(env, cookie, upload.id);
  await prepare(env, cookie); // pending, never public in the library
  const get = (suffix = "") => library({ env, request: request(`/api/admin/media/${suffix}`, "GET", undefined, cookie) });
  const data = await (await get()).json() as { assets: MediaAsset[]; total: number; totalPages: number };
  assert.equal(data.total, 1); assert.equal(data.assets.length, 1); assert.equal(data.totalPages, 1);
  assert.equal((await (await get("?purpose=preview")).json() as { total: number }).total, 0);
  assert.equal((await get("?purpose=main-video")).status, 400);
  assert.equal((await get("?page=-1")).status, 400);
  assert.equal((await get("?page=1.5")).status, 400);
  assert.equal((await (await get("?page=2")).json() as { assets: MediaAsset[] }).assets.length, 0);
  assert.equal((await get()).headers.get("cache-control"), "no-store, max-age=0");
});

test("upload signing is rate limited per admin account", async (t) => {
  const { env, cookie } = await setup(); t.after(() => env.DB.sqlite.close());
  for (let index = 0; index < 20; index++) await prepare(env, cookie);
  const response = await presign({ env, request: request("/api/admin/media/presign", "POST", intent(), cookie) });
  assert.equal(response.status, 429);
  assert.ok(Number(response.headers.get("retry-after")) > 0);
});

test("R2 public URL validation rejects credentials, private S3 URLs, HTTP, query secrets, and paths", async (t) => {
  const { env, cookie } = await setup(); t.after(() => env.DB.sqlite.close());
  for (const publicUrl of ["http://assets.example.test", "https://user:password@assets.example.test", `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`, "https://assets.example.test/?token=private", "https://assets.example.test/files/"]) {
    const response = await config({ env: { ...env, R2_PUBLIC_BASE_URL: publicUrl }, request: request("/api/admin/media/config", "GET", undefined, cookie) });
    assert.equal((await response.json() as { configured: boolean }).configured, false);
  }
});

test("lightweight file-header checks distinguish images and preview containers without transcoding", () => {
  const buffer = (value: Uint8Array) => new Uint8Array(value).buffer;
  assert.equal(signatureMatches("image/png", buffer(png)), true);
  assert.equal(signatureMatches("image/jpeg", buffer(new Uint8Array([255, 216, 255, 1]))), true);
  const avif = new Uint8Array(24); avif.set(new TextEncoder().encode("ftypavif"), 4);
  assert.equal(signatureMatches("image/avif", buffer(avif)), true);
  assert.equal(signatureMatches("video/mp4", buffer(avif)), false);
  const mp4 = new Uint8Array(24); mp4.set(new TextEncoder().encode("ftypisom"), 4);
  assert.equal(signatureMatches("video/mp4", buffer(mp4)), true);
  assert.equal(signatureMatches("image/png", buffer(mp4)), false);
});

test("verified MP4 previews preserve clip metadata and never become a main-video upload", async (t) => {
  const { env, cookie } = await setup(); t.after(() => env.DB.sqlite.close());
  const upload = await prepare(env, cookie, intent({ purpose: "preview", filename: "short-preview.mp4", contentType: "video/mp4", duration: 12 }));
  const bytes = new Uint8Array(32); bytes.set(new TextEncoder().encode("ftypisom"), 4);
  await mockPut(env, upload, {}, bytes);
  const response = await finalize(env, cookie, upload.id);
  assert.equal(response.status, 200);
  const { asset } = await response.json() as { asset: MediaAsset };
  assert.equal(asset.purpose, "preview"); assert.equal(asset.duration, 12); assert.equal(asset.contentType, "video/mp4");
  assert.ok(asset.url.includes("/media/previews/"));
});

test("ready library pages are bounded, ordered and purpose-filtered", async (t) => {
  const { env, cookie } = await setup(); t.after(() => env.DB.sqlite.close());
  for (let index = 0; index < 26; index++) {
    const id = randomUUID();
    await env.DB.prepare(`INSERT INTO media_assets (id, object_key, purpose, original_filename, content_type, size_bytes,
      width, height, status, uploader_email, upload_expires_at, created_at) VALUES (?, ?, ?, ?, 'image/png', 128, 360, 203, 'ready', ?, ?, ?)`)
      .bind(id, `media/images/${id}.png`, index < 25 ? "thumbnail" : "model-photo", `image-${index}.png`, email,
        new Date().toISOString(), new Date(Date.now() + index * 1000).toISOString()).run();
  }
  const get = async (suffix: string) => await (await library({ env, request: request(`/api/admin/media/${suffix}`, "GET", undefined, cookie) })).json() as { assets: MediaAsset[]; total: number; totalPages: number };
  const first = await get("?page=1"); const second = await get("?page=2");
  assert.equal(first.total, 26); assert.equal(first.totalPages, 2); assert.equal(first.assets.length, 24); assert.equal(second.assets.length, 2);
  assert.equal(first.assets[0].filename, "image-25.png");
  assert.ok(!second.assets.some((asset) => first.assets.some((other) => other.id === asset.id)));
  const photos = await get("?purpose=model-photo"); assert.equal(photos.total, 1); assert.equal(photos.assets[0].purpose, "model-photo");
});

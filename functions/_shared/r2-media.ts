import { AwsClient } from "aws4fetch";
import {
  IMAGE_MAX_BYTES, IMAGE_MAX_PIXELS, IMAGE_MIME_EXTENSIONS, PREVIEW_MAX_BYTES, PREVIEW_MAX_SECONDS,
  PREVIEW_MIME_EXTENSIONS, UPLOAD_EXPIRY_SECONDS, isMediaPurpose, publicAssetUrl,
  type MediaAsset, type MediaConfig, type MediaPurpose, type PresignedUpload, type UploadIntent,
} from "../../lib/media-assets";
import { ApiError, type AdminEnv } from "./admin-auth";

export interface R2ObjectMetadata {
  key: string;
  size: number;
  etag: string;
  httpMetadata?: { contentType?: string; cacheControl?: string };
  customMetadata?: Record<string, string>;
}
export interface R2HeaderBody extends R2ObjectMetadata { arrayBuffer(): Promise<ArrayBuffer> }
export interface MediaBucket {
  head(key: string): Promise<R2ObjectMetadata | null>;
  get(key: string, options: { range: { offset: number; length: number } }): Promise<R2HeaderBody | null>;
  delete(key: string): Promise<void>;
}
export interface MediaEnv extends AdminEnv {
  ASSETS_BUCKET?: MediaBucket;
  R2_ACCOUNT_ID?: string;
  R2_BUCKET_NAME?: string;
  R2_PUBLIC_BASE_URL?: string;
  R2_ACCESS_KEY_ID?: string;
  R2_SECRET_ACCESS_KEY?: string;
}
export type MediaRow = {
  id: string; object_key: string; purpose: MediaPurpose; original_filename: string; content_type: string;
  size_bytes: number; width: number; height: number; duration_seconds: number | null;
  status: "pending" | "ready" | "rejected"; uploader_email: string; upload_expires_at: string;
  object_etag: string | null; created_at: string; updated_at: string;
};

const REQUIRED = ["ASSETS_BUCKET", "R2_ACCOUNT_ID", "R2_BUCKET_NAME", "R2_PUBLIC_BASE_URL", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY"] as const;
export const UUID_PATTERN = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;

export function storageSetup(env: MediaEnv) {
  const missing = REQUIRED.filter((name) => !env[name]);
  const issues: string[] = [];
  if (env.ASSETS_BUCKET && (typeof env.ASSETS_BUCKET.head !== "function" || typeof env.ASSETS_BUCKET.get !== "function")) issues.push("ASSETS_BUCKET must be an R2 bucket binding.");
  if (env.R2_ACCOUNT_ID && !/^[a-f0-9]{32}$/i.test(env.R2_ACCOUNT_ID)) issues.push("R2_ACCOUNT_ID must be the actual 32-character Cloudflare Account ID.");
  if (env.R2_BUCKET_NAME && !/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(env.R2_BUCKET_NAME)) issues.push("R2_BUCKET_NAME must be a valid lowercase R2 bucket name.");
  if (env.R2_ACCESS_KEY_ID && (env.R2_ACCESS_KEY_ID.length < 16 || env.R2_ACCESS_KEY_ID.length > 128)) issues.push("R2_ACCESS_KEY_ID must be an R2 S3 Access Key ID, not a Cloudflare bearer API token.");
  if (env.R2_SECRET_ACCESS_KEY && env.R2_SECRET_ACCESS_KEY.length < 32) issues.push("R2_SECRET_ACCESS_KEY is not a valid S3 secret access key.");
  let publicBaseUrl: string | null = null;
  if (env.R2_PUBLIC_BASE_URL) {
    try {
      const url = new URL(env.R2_PUBLIC_BASE_URL);
      if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash
        || url.pathname !== "/" || url.port || url.hostname.endsWith(".r2.cloudflarestorage.com")) throw new Error("Invalid public URL");
      publicBaseUrl = url.origin;
    } catch { issues.push("R2_PUBLIC_BASE_URL must be an HTTPS public asset origin, not the private S3 endpoint or a path."); }
  }
  return { configured: missing.length === 0 && issues.length === 0, missing: [...missing], issues, publicBaseUrl, bucketName: env.R2_BUCKET_NAME ?? null };
}

export function requireStorage(env: MediaEnv) {
  const setup = storageSetup(env);
  if (!setup.configured || !setup.publicBaseUrl) throw new ApiError("R2 storage is not configured. Connect ASSETS_BUCKET and set the R2 variables/secrets in the same Pages environment.", 503);
  return { bucket: env.ASSETS_BUCKET!, publicBaseUrl: setup.publicBaseUrl };
}

export async function mediaConfig(env: MediaEnv): Promise<MediaConfig> {
  const setup = storageSetup(env);
  let migrationApplied = false;
  try { await env.DB!.prepare("SELECT id FROM media_assets LIMIT 1").first(); migrationApplied = true; } catch { /* Fail closed until the migration exists. */ }
  return { ...setup, configured: setup.configured && migrationApplied, migrationApplied,
    limits: { imageBytes: IMAGE_MAX_BYTES, previewBytes: PREVIEW_MAX_BYTES, previewSeconds: PREVIEW_MAX_SECONDS, imagePixels: IMAGE_MAX_PIXELS } };
}

export function validateIntent(body: Record<string, unknown>): UploadIntent {
  if (!isMediaPurpose(body.purpose) || typeof body.filename !== "string" || !body.filename.trim() || body.filename.length > 160
    || typeof body.contentType !== "string" || typeof body.size !== "number" || !Number.isSafeInteger(body.size) || body.size < 1
    || typeof body.width !== "number" || !Number.isInteger(body.width) || body.width < 1 || body.width > 8192
    || typeof body.height !== "number" || !Number.isInteger(body.height) || body.height < 1 || body.height > 8192) {
    throw new ApiError("Invalid file metadata. Choose a supported image or a short preview clip.", 400);
  }
  const preview = body.purpose === "preview";
  const contentType = body.contentType.toLowerCase();
  if (!Object.prototype.hasOwnProperty.call(preview ? PREVIEW_MIME_EXTENSIONS : IMAGE_MIME_EXTENSIONS, contentType)) throw new ApiError(preview ? "Preview uploads accept MP4 or WebM only. Main video files are not uploaded here." : "Images must be JPEG, PNG, WebP or AVIF. SVG/HTML uploads are not allowed.", 400);
  if (body.size > (preview ? PREVIEW_MAX_BYTES : IMAGE_MAX_BYTES)) throw new ApiError(preview ? "Preview file exceeds 25 MB." : "Image file exceeds 5 MB.", 400);
  if (!preview && body.width * body.height > IMAGE_MAX_PIXELS) throw new ApiError("Image exceeds the 32-megapixel limit. Resize it before uploading.", 400);
  if (preview && (typeof body.duration !== "number" || !Number.isFinite(body.duration) || body.duration <= 0 || body.duration > PREVIEW_MAX_SECONDS)) throw new ApiError("Only short previews up to 60 seconds are allowed. Keep the main video as a provider URL.", 400);
  if (!preview && body.duration !== undefined) throw new ApiError("Image uploads must not include video duration.", 400);
  const filename = body.filename.replace(/[\\/\u0000-\u001f\u007f]/g, "_").trim();
  return { purpose: body.purpose, filename, contentType, size: body.size, width: body.width, height: body.height,
    ...(preview ? { duration: body.duration as number } : {}) };
}

export function newObjectKey(intent: UploadIntent, id: string, now: Date) {
  const preview = intent.purpose === "preview";
  const extension = (preview ? PREVIEW_MIME_EXTENSIONS : IMAGE_MIME_EXTENSIONS)[intent.contentType];
  const folder = preview ? "previews" : `images/${intent.purpose}`;
  return `media/${folder}/${now.toISOString().slice(0, 7).replace("-", "/")}/${id}.${extension}`;
}

export async function signUpload(env: MediaEnv, id: string, key: string, intent: UploadIntent, now: Date): Promise<PresignedUpload> {
  requireStorage(env);
  const url = new URL(`https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${env.R2_BUCKET_NAME}/${key}`);
  url.searchParams.set("X-Amz-Expires", String(UPLOAD_EXPIRY_SECONDS));
  const headers = {
    "content-type": intent.contentType,
    "cache-control": "public, max-age=31536000, immutable",
    "if-none-match": "*",
    "x-amz-meta-asset-id": id,
    "x-amz-meta-purpose": intent.purpose,
  };
  const client = new AwsClient({ accessKeyId: env.R2_ACCESS_KEY_ID!, secretAccessKey: env.R2_SECRET_ACCESS_KEY!, service: "s3", region: "auto" });
  const signed = await client.sign(url, {
    method: "PUT", headers: { ...headers, "content-length": String(intent.size) },
    aws: { signQuery: true, allHeaders: true, datetime: now.toISOString().replace(/[:-]|\.\d{3}/g, "") },
  });
  // Content-Length and Host are signed, but the browser supplies them automatically for a File/Blob.
  // Never return reusable credentials or account API tokens to the browser.
  return { id, key, url: signed.url, headers, expiresAt: new Date(now.getTime() + UPLOAD_EXPIRY_SECONDS * 1000).toISOString() };
}

export function rowToAsset(row: MediaRow, base: string): MediaAsset {
  return { id: row.id, key: row.object_key, purpose: row.purpose, filename: row.original_filename, contentType: row.content_type,
    size: Number(row.size_bytes), width: Number(row.width), height: Number(row.height), duration: row.duration_seconds,
    createdAt: row.created_at, url: publicAssetUrl(base, row.object_key) };
}

export function signatureMatches(contentType: string, buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  const ascii = (from: number, to: number) => new TextDecoder().decode(bytes.slice(from, to));
  switch (contentType) {
    case "image/jpeg": return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    case "image/png": return bytes.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => bytes[index] === byte);
    case "image/webp": return bytes.length >= 16 && ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP";
    case "image/avif": return bytes.length >= 16 && ascii(4, 8) === "ftyp" && /avif|avis/.test(ascii(8, 64));
    case "video/mp4": return bytes.length >= 16 && ascii(4, 8) === "ftyp" && !/avif|avis/.test(ascii(8, 64));
    case "video/webm": return bytes.length >= 4 && [0x1a, 0x45, 0xdf, 0xa3].every((byte, index) => bytes[index] === byte);
    default: return false;
  }
}

export const MEDIA_PURPOSES = ["thumbnail", "model-photo", "channel-photo", "preview"] as const;
export type MediaPurpose = (typeof MEDIA_PURPOSES)[number];

export const MEDIA_PURPOSE_LABELS: Record<MediaPurpose, string> = {
  thumbnail: "Video thumbnail",
  "model-photo": "Model photo",
  "channel-photo": "Channel photo",
  preview: "Short video preview",
};

export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const PREVIEW_MAX_BYTES = 25 * 1024 * 1024;
export const PREVIEW_MAX_SECONDS = 60;
export const IMAGE_MAX_PIXELS = 32_000_000;
export const UPLOAD_EXPIRY_SECONDS = 10 * 60;

export const IMAGE_MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif",
};
export const PREVIEW_MIME_EXTENSIONS: Record<string, string> = { "video/mp4": "mp4", "video/webm": "webm" };

export type MediaAsset = {
  id: string;
  key: string;
  purpose: MediaPurpose;
  filename: string;
  contentType: string;
  size: number;
  width: number;
  height: number;
  duration: number | null;
  url: string;
  createdAt: string;
};

export type MediaConfig = {
  configured: boolean;
  migrationApplied: boolean;
  missing: string[];
  issues: string[];
  publicBaseUrl: string | null;
  bucketName: string | null;
  limits: { imageBytes: number; previewBytes: number; previewSeconds: number; imagePixels: number };
};

export type UploadIntent = {
  purpose: MediaPurpose;
  filename: string;
  contentType: string;
  size: number;
  width: number;
  height: number;
  duration?: number;
};

export type PresignedUpload = {
  id: string;
  key: string;
  url: string;
  headers: Record<string, string>;
  expiresAt: string;
};

export function isMediaPurpose(value: unknown): value is MediaPurpose {
  return typeof value === "string" && MEDIA_PURPOSES.includes(value as MediaPurpose);
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function publicAssetUrl(base: string, key: string) {
  return `${base.replace(/\/+$/, "")}/${key.split("/").map(encodeURIComponent).join("/")}`;
}

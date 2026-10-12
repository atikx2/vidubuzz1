import {
  IMAGE_MAX_BYTES, IMAGE_MAX_PIXELS, IMAGE_MIME_EXTENSIONS, PREVIEW_MAX_BYTES, PREVIEW_MAX_SECONDS,
  PREVIEW_MIME_EXTENSIONS, type MediaPurpose, type PresignedUpload, type UploadIntent,
} from "./media-assets";

export async function inspectMediaFile(file: File, purpose: MediaPurpose): Promise<UploadIntent> {
  const preview = purpose === "preview";
  const contentType = file.type.toLowerCase();
  const supported = Object.prototype.hasOwnProperty.call(preview ? PREVIEW_MIME_EXTENSIONS : IMAGE_MIME_EXTENSIONS, contentType);
  if (!supported) throw new Error(preview ? "Choose an MP4 or WebM preview clip, not a main-video file." : "Choose a JPEG, PNG, WebP or AVIF image.");
  if (!file.size || file.size > (preview ? PREVIEW_MAX_BYTES : IMAGE_MAX_BYTES)) throw new Error(preview ? "Preview file must be 25 MB or smaller." : "Image file must be 5 MB or smaller.");
  const url = URL.createObjectURL(file);
  try {
    const metadata = await new Promise<{ width: number; height: number; duration?: number }>((resolve, reject) => {
      const element = preview ? document.createElement("video") : document.createElement("img");
      let settled = false;
      const finish = (error?: Error) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        element.onerror = null;
        if (element instanceof HTMLVideoElement) {
          element.onloadedmetadata = null;
          const result = { width: element.videoWidth, height: element.videoHeight, duration: element.duration };
          element.removeAttribute("src"); element.load();
          if (error) reject(error); else resolve(result);
        } else {
          element.onload = null;
          if (error) reject(error); else resolve({ width: element.naturalWidth, height: element.naturalHeight });
        }
      };
      const timer = window.setTimeout(() => finish(new Error("Media metadata could not be read. Choose another file.")), 15_000);
      element.onerror = () => finish(new Error("This file cannot be decoded in your browser."));
      if (element instanceof HTMLVideoElement) { element.preload = "metadata"; element.onloadedmetadata = () => finish(); }
      else element.onload = () => finish();
      element.src = url;
    });
    if (!metadata.width || !metadata.height || metadata.width > 8192 || metadata.height > 8192) throw new Error("Unsupported media dimensions. Resize the file first.");
    if (!preview && metadata.width * metadata.height > IMAGE_MAX_PIXELS) throw new Error("Image exceeds 32 megapixels. Resize it before uploading.");
    if (preview && (!Number.isFinite(metadata.duration) || (metadata.duration ?? 0) <= 0 || (metadata.duration ?? 0) > PREVIEW_MAX_SECONDS)) throw new Error("Only preview clips up to 60 seconds are accepted. Keep the main video as a provider URL.");
    return { purpose, filename: file.name, contentType, size: file.size, ...metadata };
  } finally { URL.revokeObjectURL(url); }
}

export function putDirectToR2(upload: PresignedUpload, file: File, onProgress: (percent: number) => void, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) { reject(new DOMException("Upload cancelled", "AbortError")); return; }
    const xhr = new XMLHttpRequest();
    const abort = () => xhr.abort();
    const cleanup = () => signal.removeEventListener("abort", abort);
    xhr.open("PUT", upload.url);
    xhr.timeout = 10 * 60_000;
    // The signature authorizes exactly this File size. The browser supplies Host/Content-Length.
    for (const [name, value] of Object.entries(upload.headers)) xhr.setRequestHeader(name, value);
    xhr.upload.onprogress = (event) => { if (event.lengthComputable) onProgress(Math.min(100, Math.round(event.loaded / event.total * 100))); };
    xhr.onload = () => {
      cleanup();
      if (xhr.status >= 200 && xhr.status < 300) { onProgress(100); resolve(); }
      else reject(new Error(xhr.status === 412 ? "This upload URL was already used. Prepare a new upload." : `R2 upload failed (${xhr.status}). Check the bucket CORS policy and S3 credentials, then prepare a new upload.`));
    };
    xhr.onerror = () => { cleanup(); reject(new Error("Direct R2 upload could not connect. Check the bucket's CORS origins/headers and your network.")); };
    xhr.ontimeout = () => { cleanup(); reject(new Error("Upload timed out. Try a smaller preview or a faster connection.")); };
    xhr.onabort = () => { cleanup(); reject(new DOMException("Upload cancelled", "AbortError")); };
    signal.addEventListener("abort", abort, { once: true });
    xhr.send(file);
  });
}

"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, ChevronRight, CloudUpload, Images, LoaderCircle, RefreshCw, UserRound, X } from "lucide-react";
import { AdminApiError, adminPost, adminRequest } from "@/lib/admin-api";
import { type MediaAsset, type MediaConfig, type PresignedUpload } from "@/lib/media-assets";
import { inspectMediaFile, putDirectToR2 } from "@/lib/media-upload-client";

type Gallery = { assets: MediaAsset[]; page: number; total: number; totalPages: number };
type Photo = { id: string | null; url: string | null };
type Phase = "idle" | "preparing" | "uploading" | "verifying";

export function AdminModelPhotoPicker({ value, onChange, disabled, onBusyChange }: {
  value: Photo; onChange: (photo: Photo) => void; disabled: boolean; onBusyChange: (busy: boolean) => void;
}) {
  const router = useRouter();
  const [config, setConfig] = useState<MediaConfig | null>(null);
  const [open, setOpen] = useState(false);
  const [gallery, setGallery] = useState<Gallery | null>(null);
  const [page, setPage] = useState(1);
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const uploadController = useRef<AbortController | null>(null);
  const busy = phase !== "idle";
  useEffect(() => () => uploadController.current?.abort(), []);

  useEffect(() => {
    const controller = new AbortController();
    void adminRequest<MediaConfig>("/api/admin/media/config", { signal: controller.signal })
      .then((result) => { if (!controller.signal.aborted) setConfig(result); })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        if (cause instanceof AdminApiError && cause.status === 401) router.replace("/admin/login/");
        else setError(cause instanceof Error ? cause.message : "Could not load R2 setup.");
      });
    return () => controller.abort();
  }, [router]);

  useEffect(() => {
    if (!open || !config?.configured) return;
    const controller = new AbortController();
    setLoading(true);
    void adminRequest<Gallery>(`/api/admin/media/?kind=image&page=${page}`, { signal: controller.signal })
      .then((result) => { if (!controller.signal.aborted) setGallery(result); })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        if (cause instanceof AdminApiError && cause.status === 401) router.replace("/admin/login/");
        else setError(cause instanceof Error ? cause.message : "Could not load photos.");
      }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [open, config, page, refresh, router]);

  function setUploadPhase(next: Phase) { setPhase(next); onBusyChange(next !== "idle"); }
  async function verify(id: string) {
    setUploadPhase("verifying");
    const result = await adminPost<{ asset: MediaAsset }>("/api/admin/media/complete", { id });
    onChange({ id: result.asset.id, url: result.asset.url });
    setPendingId(null); setPage(1); setRefresh((n) => n + 1); setOpen(false);
  }
  async function upload(file: File) {
    if (busy || disabled || !config?.configured) return;
    setError(""); setProgress(0); setPendingId(null); setUploadPhase("preparing");
    const controller = new AbortController(); uploadController.current = controller;
    let uploaded = false;
    let id: string | null = null;
    try {
      const intent = await inspectMediaFile(file, "model-photo");
      if (controller.signal.aborted) throw new DOMException("Upload cancelled", "AbortError");
      const signed = await adminPost<PresignedUpload>("/api/admin/media/presign", intent);
      if (controller.signal.aborted) throw new DOMException("Upload cancelled", "AbortError");
      id = signed.id; setUploadPhase("uploading");
      await putDirectToR2(signed, file, setProgress, controller.signal); uploaded = true;
      if (controller.signal.aborted) throw new DOMException("Upload cancelled", "AbortError");
      await verify(id);
    } catch (cause) {
      if (cause instanceof AdminApiError && cause.status === 401) router.replace("/admin/login/");
      setError(cause instanceof Error && cause.name === "AbortError" ? "Upload cancelled. You can choose another photo." : cause instanceof Error ? cause.message : "Photo upload failed.");
      if (uploaded && id) setPendingId(id);
    } finally { setUploadPhase("idle"); uploadController.current = null; if (input.current) input.current.value = ""; }
  }
  async function retryVerification() {
    if (!pendingId || busy || disabled) return;
    setError("");
    try { await verify(pendingId); }
    catch (cause) {
      if (cause instanceof AdminApiError && cause.status === 401) router.replace("/admin/login/");
      setError(cause instanceof Error ? cause.message : "Photo verification failed.");
    } finally { setUploadPhase("idle"); }
  }

  return <div className="model-photo-picker">
    <div className="model-photo-selection">
      <div className="model-photo-preview">{value.url ? <img key={value.url} src={value.url} alt="Selected model thumbnail" decoding="async" /> : <UserRound size={34} strokeWidth={1.3} />}{value.id && <span><Check size={11} />R2</span>}</div>
      <div><strong>Profile thumbnail</strong><p>A clear portrait works best.<br />JPEG, PNG, WebP or AVIF · up to 5 MB.</p>
        <div className="model-photo-buttons"><button className="model-button model-button-secondary" type="button" disabled={disabled || busy || !config?.configured} onClick={() => setOpen((current) => !current)} aria-expanded={open} aria-controls="model-photo-gallery"><Images size={14} />{open ? "Hide library" : "Choose image"}</button>
          <button className="model-button model-button-quiet" type="button" disabled={disabled || busy || !config?.configured || !!pendingId} onClick={() => input.current?.click()}><CloudUpload size={14} />Upload photo</button>
          {value.url && <button className="model-photo-remove" type="button" disabled={disabled || busy} onClick={() => onChange({ id: null, url: null })} aria-label="Remove selected model photo"><X size={14} /></button>}
        </div>
      </div>
    </div>
    <input ref={input} className="admin-visually-hidden" type="file" accept="image/jpeg,image/png,image/webp,image/avif" aria-label="Upload model photo" disabled={disabled || busy || !config?.configured} onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); }} />
    {!config && !error && <p className="model-field-hint">Checking R2 connection…</p>}
    {config && !config.configured && <p className="model-field-hint model-text-amber">R2 setup is incomplete. Check the <Link href="/admin/media/" target="_blank">Media library</Link> first. You can still save a draft.</p>}
    {busy && <div className="model-upload-status" role="status"><span><LoaderCircle size={14} className="admin-refresh-spinning" />{phase === "preparing" ? "Checking and preparing photo…" : phase === "uploading" ? `Uploading to R2 · ${progress}%` : "Verifying photo…"}</span><progress max={100} value={progress} aria-label="Model photo upload progress" />{phase !== "verifying" && <button type="button" onClick={() => uploadController.current?.abort()}>Cancel upload</button>}</div>}
    {error && <p className="admin-form-error" role="alert">{error}</p>}
    {pendingId && !busy && <button type="button" className="model-button model-button-secondary model-retry-photo" disabled={disabled} onClick={() => void retryVerification()}><RefreshCw size={13} />Retry photo verification</button>}
    {open && <div className="model-photo-gallery" id="model-photo-gallery" aria-busy={loading}>
      <div className="model-photo-gallery-heading"><span>{loading ? "Loading R2 images…" : `${gallery?.total ?? 0} verified images`}</span><button type="button" className="admin-media-icon-button" aria-label="Refresh image picker" disabled={loading || busy || disabled} onClick={() => { setError(""); setRefresh((n) => n + 1); }}><RefreshCw size={13} /></button></div>
      {!!gallery?.assets.length && <div className="model-photo-grid">{gallery.assets.map((asset) => <button key={asset.id} type="button" className={value.id === asset.id ? "model-photo-option model-photo-option-selected" : "model-photo-option"} disabled={busy || disabled || loading} aria-label={`Choose ${asset.filename}`} aria-pressed={value.id === asset.id} title={asset.filename} onClick={() => { onChange({ id: asset.id, url: asset.url }); setOpen(false); }}><img src={asset.url} alt={asset.filename} loading="lazy" decoding="async" />{value.id === asset.id && <span><Check size={13} /></span>}</button>)}</div>}
      {!loading && !gallery?.assets.length && <p className="model-field-hint">No images yet. Upload a photo above to get started.</p>}
      {gallery && gallery.totalPages > 1 && <div className="model-photo-pagination"><button type="button" aria-label="Previous image page" disabled={page <= 1 || loading || busy} onClick={() => setPage((n) => n - 1)}><ChevronLeft size={16} /></button><span>{page} / {gallery.totalPages}</span><button type="button" aria-label="Next image page" disabled={page >= gallery.totalPages || loading || busy} onClick={() => setPage((n) => n + 1)}><ChevronRight size={16} /></button></div>}
    </div>}
  </div>;
}

"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ArrowDownToLine, ArrowUpRight, CheckCircle2, ChevronLeft, ChevronRight, CloudUpload, Copy,
  Film, Image as ImageIcon, LoaderCircle, RefreshCw, ShieldCheck, X,
} from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { useAdminSession } from "@/components/use-admin-session";
import { AdminApiError, adminPost, adminRequest } from "@/lib/admin-api";
import {
  IMAGE_MAX_BYTES, MEDIA_PURPOSES, MEDIA_PURPOSE_LABELS, PREVIEW_MAX_BYTES, PREVIEW_MAX_SECONDS,
  formatBytes, type MediaAsset, type MediaConfig, type MediaPurpose, type PresignedUpload,
} from "@/lib/media-assets";
import { inspectMediaFile, putDirectToR2 } from "@/lib/media-upload-client";
import { useRouter } from "next/navigation";

type LibraryResponse = { assets: MediaAsset[]; page: number; total: number; totalPages: number };
type Phase = "idle" | "preparing" | "uploading" | "verifying" | "verification-failed";

export function AdminMediaLibrary() {
  const router = useRouter();
  const { session, error: sessionError } = useAdminSession();
  const [config, setConfig] = useState<MediaConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [purpose, setPurpose] = useState<MediaPurpose>("thumbnail");
  const [file, setFile] = useState<File | null>(null);
  const [localUrl, setLocalUrl] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [copyStatus, setCopyStatus] = useState("");
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(1);
  const [refresh, setRefresh] = useState(0);
  const [library, setLibrary] = useState<LibraryResponse | null>(null);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const uploadController = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const busy = phase === "preparing" || phase === "uploading" || phase === "verifying";

  useEffect(() => () => uploadController.current?.abort(), []);
  useEffect(() => {
    if (!file) { setLocalUrl(""); return; }
    const url = URL.createObjectURL(file); setLocalUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (!session) return;
    const controller = new AbortController();
    void adminRequest<MediaConfig>("/api/admin/media/config", { signal: controller.signal })
      .then((result) => { if (!controller.signal.aborted) setConfig(result); })
      .catch((cause) => {
        if (controller.signal.aborted) return;
        if (cause instanceof AdminApiError && cause.status === 401) router.replace("/admin/login/");
        else setError(cause instanceof Error ? cause.message : "Media configuration could not be loaded.");
      })
      .finally(() => { if (!controller.signal.aborted) setConfigLoading(false); });
    return () => controller.abort();
  }, [session, router]);

  useEffect(() => {
    if (!config?.configured || !session) return;
    const controller = new AbortController();
    setLibraryLoading(true);
    const query = new URLSearchParams({ page: String(page), ...(filter ? { purpose: filter } : {}) });
    void adminRequest<LibraryResponse>(`/api/admin/media/?${query}`, { signal: controller.signal })
      .then((result) => { if (!controller.signal.aborted) setLibrary(result); })
      .catch((cause) => {
        if (controller.signal.aborted) return;
        if (cause instanceof AdminApiError && cause.status === 401) router.replace("/admin/login/");
        else setError(cause instanceof Error ? cause.message : "Media library could not be loaded.");
      })
      .finally(() => { if (!controller.signal.aborted) setLibraryLoading(false); });
    return () => controller.abort();
  }, [config, session, page, filter, refresh, router]);

  function chooseFile(value: File | null) {
    setFile(value); setError(""); setSuccess(""); setPendingId(null); setPhase("idle"); setProgress(0);
  }

  async function verify(id: string) {
    setPhase("verifying");
    const result = await adminPost<{ asset: MediaAsset }>("/api/admin/media/complete", { id });
    setSuccess(`${result.asset.filename} uploaded to R2 and added to the media library.`);
    setPendingId(null); setFile(null); setPhase("idle"); setProgress(0); setPage(1); setRefresh((value) => value + 1);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || !config?.configured || !file || busy) return;
    setError(""); setSuccess(""); setProgress(0); setPhase("preparing");
    const controller = new AbortController(); uploadController.current = controller;
    let uploaded = false;
    let id: string | null = null;
    try {
      const intent = await inspectMediaFile(file, purpose);
      if (controller.signal.aborted) throw new DOMException("Cancelled", "AbortError");
      const upload = await adminPost<PresignedUpload>("/api/admin/media/presign", intent);
      if (controller.signal.aborted) throw new DOMException("Cancelled", "AbortError");
      id = upload.id; setPendingId(id); setPhase("uploading");
      await putDirectToR2(upload, file, setProgress, controller.signal);
      uploaded = true;
      if (controller.signal.aborted) throw new DOMException("Cancelled", "AbortError");
      await verify(id);
    } catch (cause) {
      if (cause instanceof AdminApiError && cause.status === 401) router.replace("/admin/login/");
      if (cause instanceof Error && cause.name === "AbortError") setError("Upload cancelled. Prepare a new upload to try again.");
      else setError(cause instanceof Error ? cause.message : "Upload failed.");
      setPhase(uploaded && id ? "verification-failed" : "idle");
      if (!uploaded) setPendingId(null);
    } finally { uploadController.current = null; }
  }

  async function retryVerification() {
    if (!pendingId || busy) return;
    setError("");
    try { await verify(pendingId); }
    catch (cause) {
      if (cause instanceof AdminApiError && cause.status === 401) router.replace("/admin/login/");
      setError(cause instanceof Error ? cause.message : "Verification failed."); setPhase("verification-failed");
    }
  }

  async function copy(url: string) {
    try { await navigator.clipboard.writeText(url); setCopyStatus("Asset URL copied."); }
    catch { setCopyStatus("Copy was blocked by the browser. Select the URL field below to copy it manually."); }
  }

  return (
    <AdminShell title="Media library" subtitle="R2 images and short previews. Main videos stay on provider URLs." email={session?.email}>
      {(sessionError || error) && <p className="admin-form-error" role="alert">{sessionError || error}</p>}
      {success && <p className="admin-form-success" role="status"><CheckCircle2 size={17} />{success}</p>}
      {configLoading && session && <div className="admin-media-loading"><LoaderCircle size={17} className="admin-refresh-spinning" />Checking R2 setup…</div>}
      {config && !config.configured && <section className="admin-panel-card admin-media-setup" aria-labelledby="r2-setup-title"><div className="admin-panel-heading"><div><p>STORAGE SETUP</p><h2 id="r2-setup-title">Connect your R2 bucket</h2><span>Uploads remain disabled until the bucket, secrets and D1 migration are ready.</span></div><ShieldCheck size={21} /></div>
        {!!config.missing.length && <p>Missing bindings/settings: <strong>{config.missing.join(", ")}</strong></p>}
        {!config.migrationApplied && <p>Apply <code>migrations/0002_r2_media.sql</code> to the same D1 database.</p>}
        {config.issues.map((issue) => <p key={issue}>{issue}</p>)}
        <p>Create a Standard R2 bucket, connect a public asset domain, bind it as <code>ASSETS_BUCKET</code>, and configure browser PUT CORS. Follow <code>docs/r2-setup.md</code>. Never put S3 secret keys in frontend code or chat.</p>
      </section>}
      <div className="admin-media-storage-status"><span><i className={config?.configured ? "admin-live-dot" : "admin-media-inactive-dot"} />{config?.configured ? "R2 configured" : "R2 setup pending"}</span><span>{config?.bucketName || "No bucket connected"}</span><span><ShieldCheck size={13} />Admin-only uploads</span></div>
      <section className="admin-panel-card admin-media-upload-panel" aria-labelledby="media-upload-title">
        <div className="admin-panel-heading"><div><p>ADD AN ASSET</p><h2 id="media-upload-title">Upload to R2</h2><span>File bytes go directly from your browser to R2, not through a Worker upload proxy.</span></div><span className="admin-panel-icon"><CloudUpload size={20} /></span></div>
        <form className="admin-media-upload-form" onSubmit={submit}>
          <div className="admin-media-fields"><div><label htmlFor="media-purpose">Use this file as</label><select id="media-purpose" value={purpose} disabled={busy} onChange={(event) => { setPurpose(event.target.value as MediaPurpose); chooseFile(null); if (inputRef.current) inputRef.current.value = ""; }}>{MEDIA_PURPOSES.map((value) => <option key={value} value={value}>{MEDIA_PURPOSE_LABELS[value]}</option>)}</select></div><div className="admin-media-limit-note">{purpose === "preview" ? <><Film size={16} /><span>MP4/WebM · {formatBytes(PREVIEW_MAX_BYTES)} max · {PREVIEW_MAX_SECONDS} sec max<br />Prepared preview clips only; no main-video upload.</span></> : <><ImageIcon size={16} /><span>JPEG, PNG, WebP or AVIF<br />{formatBytes(IMAGE_MAX_BYTES)} max · 32 megapixels max</span></>}</div></div>
          <label className={`admin-media-file-picker ${busy || !config?.configured ? "media-picker-disabled" : ""}`} htmlFor="media-file"><CloudUpload size={25} /><strong>{file ? file.name : "Choose a file from your phone or computer"}</strong><span>{file ? formatBytes(file.size) : "Images and short previews only"}<ArrowDownToLine size={14} /></span></label>
          <input className="admin-media-file-input" ref={inputRef} id="media-file" type="file" accept={purpose === "preview" ? "video/mp4,video/webm" : "image/jpeg,image/png,image/webp,image/avif"} disabled={busy || !config?.configured} onChange={(event) => chooseFile(event.target.files?.[0] ?? null)} />
          {localUrl && file && <div className="admin-media-local-preview">{purpose === "preview" ? <video src={localUrl} controls playsInline preload="metadata" /> : <img src={localUrl} alt="Selected file preview" />}<span>{MEDIA_PURPOSE_LABELS[purpose]}</span></div>}
          {busy && <div className="admin-media-upload-progress" role="status"><div><span>{phase === "preparing" ? "Checking file and signing a one-object upload URL…" : phase === "uploading" ? `Uploading directly to R2 · ${progress}%` : "Verifying R2 metadata and file header…"}</span><b>{phase === "uploading" ? `${progress}%` : ""}</b></div><progress value={progress} max={100} aria-label="Upload progress" /></div>}
          <div className="admin-media-upload-actions"><button className="admin-login-submit" type="submit" disabled={busy || !file || !config?.configured || phase === "verification-failed"}><CloudUpload size={16} />{busy ? "Uploading…" : "Upload to R2"}</button>{(phase === "preparing" || phase === "uploading") && <button className="admin-media-secondary-button" type="button" onClick={() => uploadController.current?.abort()}><X size={15} />Cancel</button>}{phase === "verification-failed" && pendingId && <button className="admin-media-secondary-button" type="button" onClick={() => void retryVerification()}><RefreshCw size={15} />Retry verification</button>}{file && !busy && <button className="admin-media-secondary-button" type="button" onClick={() => { chooseFile(null); if (inputRef.current) inputRef.current.value = ""; }}>Clear</button>}</div>
        </form>
      </section>
      <section className="admin-panel-card admin-media-library-panel" aria-labelledby="media-library-title">
        <div className="admin-panel-heading"><div><p>YOUR UPLOADED FILES</p><h2 id="media-library-title">Media library <small>{library?.total ?? 0}</small></h2><span>Copy these public URLs into model/channel/video fields when content editing is added.</span></div><button className="admin-media-icon-button" type="button" aria-label="Refresh media library" disabled={!config?.configured || libraryLoading} onClick={() => setRefresh((value) => value + 1)}><RefreshCw size={16} className={libraryLoading ? "admin-refresh-spinning" : ""} /></button></div>
        <div className="admin-media-library-toolbar"><label htmlFor="media-filter">Filter</label><select id="media-filter" value={filter} disabled={!config?.configured} onChange={(event) => { setFilter(event.target.value); setPage(1); }}><option value="">All assets</option>{MEDIA_PURPOSES.map((value) => <option value={value} key={value}>{MEDIA_PURPOSE_LABELS[value]}</option>)}</select><span>{libraryLoading ? "Loading…" : config?.publicBaseUrl || "Public asset domain not configured"}</span></div>
        {copyStatus && <p className="admin-media-copy-status" role="status">{copyStatus}</p>}
        {library?.assets.length ? <div className="admin-media-grid">{library.assets.map((asset) => <article className="admin-media-card" key={asset.id}><div className="admin-media-cover">{asset.purpose === "preview" ? <video src={asset.url} controls playsInline preload="none" aria-label={`Preview clip: ${asset.filename}`} /> : <img src={asset.url} alt={asset.filename} loading="lazy" decoding="async" />}</div><div className="admin-media-card-copy"><span>{MEDIA_PURPOSE_LABELS[asset.purpose]}</span><strong title={asset.filename}>{asset.filename}</strong><small>{asset.width} × {asset.height} · {formatBytes(asset.size)}{asset.duration ? ` · ${Math.round(asset.duration)} sec` : ""}</small><input className="admin-media-url" type="text" readOnly value={asset.url} aria-label={`Public asset URL for ${asset.filename}`} onFocus={(event) => event.currentTarget.select()} /><div><button type="button" onClick={() => void copy(asset.url)}><Copy size={13} />Copy URL</button><a href={asset.url} target="_blank" rel="noopener noreferrer">Open<ArrowUpRight size={13} /></a></div></div></article>)}</div> : <div className="admin-empty-state"><ImageIcon size={22} /><strong>{libraryLoading ? "Loading media…" : "No verified uploads yet"}</strong><p>R2 thumbnails, photos and short preview clips will appear here. Nothing is uploaded to B2.</p></div>}
        {!!library && library.totalPages > 1 && <div className="admin-media-pagination"><button type="button" onClick={() => setPage((value) => value - 1)} disabled={page <= 1 || libraryLoading}><ChevronLeft size={15} />Previous</button><span>Page {page} of {library.totalPages}</span><button type="button" onClick={() => setPage((value) => value + 1)} disabled={page >= library.totalPages || libraryLoading}>Next<ChevronRight size={15} /></button></div>}
      </section>
      <p className="admin-dashboard-footnote"><ShieldCheck size={14} /><span>Public read access must be configured on the R2 custom domain. This library does not proxy public file delivery or transcode videos.</span></p>
    </AdminShell>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, CheckCircle2, CloudUpload, Info, LoaderCircle, RefreshCw, ShieldCheck } from "lucide-react";
import { AdminApiError, adminPost, adminRequest } from "@/lib/admin-api";
import type { PlatformConfig } from "@/lib/platform";

export function useAdminResource<T>(url: string, enabled: boolean, refresh = 0) {
  const router = useRouter();
  const [data, setData] = useState<T | null>(null), [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!enabled) { setLoading(false); return; }
    const controller = new AbortController(); setLoading(true); setError("");
    void adminRequest<T>(url, { signal: controller.signal }).then((result) => { if (!controller.signal.aborted) setData(result); })
      .catch((cause: unknown) => { if (controller.signal.aborted) return; if (cause instanceof AdminApiError && cause.status === 401) router.replace("/admin/login/"); else setError(cause instanceof Error ? cause.message : "Could not load this workspace."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [url, enabled, refresh, router]);
  return { data, setData, error, loading: enabled && (loading || !data && !error) };
}
export function WorkspaceAlert({ children, success = false }: { children: React.ReactNode; success?: boolean }) {
  return <div className={`workspace-alert ${success ? "workspace-alert-success" : ""}`} role={success ? "status" : "alert"}>{success ? <CheckCircle2 size={18} /> : <Info size={18} />}<div>{children}</div></div>;
}
export function WorkspaceSetup({ message }: { message?: string }) {
  return <section className="workspace-setup"><span className="workspace-icon"><ShieldCheck size={24} /></span><h2>One database update to get started</h2><p>{message || "Apply migration 0004 to the same D1 database used by your admin login. Existing passwords, models and media are kept."}</p><Link className="model-button model-button-primary" href="/admin/api/">Open setup & API status<ArrowUpRight size={15} /></Link></section>;
}
export function WorkspaceLoading() { return <div className="workspace-loading" role="status"><LoaderCircle size={22} className="admin-refresh-spinning" />Loading workspace…</div>; }
export function WorkspaceRefresh({ busy, onClick }: { busy: boolean; onClick: () => void }) { return <button className="model-button model-button-secondary" type="button" disabled={busy} onClick={onClick}><RefreshCw size={15} className={busy ? "admin-refresh-spinning" : ""} />Refresh</button>; }
export function AdminPublishing({ config }: { config: PlatformConfig | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(""), [error, setError] = useState("");
  async function publish() {
    if (!config?.publishingConfigured || busy) return;
    if (!window.confirm("Queue a public build of all eligible models, channels, categories, settings and reviewed pages? Saved drafts remain private.")) return;
    setBusy(true); setError(""); setMessage("");
    try { const result = await adminPost<{ message: string }>("/api/admin/publish"); setMessage(result.message); }
    catch (cause) { if (cause instanceof AdminApiError && cause.status === 401) router.replace("/admin/login/"); setError(cause instanceof Error ? cause.message : "Publish could not be queued."); }
    finally { setBusy(false); }
  }
  return <section className="workspace-publishing"><span className="workspace-icon"><CloudUpload size={23} /></span><div><p className="workspace-eyebrow">STATIC PUBLISHING</p><h2>Saved is not live</h2><p>Save your work in D1. A successful Pages build updates the public site—no catalog database query on every visitor request.</p><small>{config?.snapshotSource === "d1" && config.snapshotBuiltAt ? `Snapshot built ${new Date(config.snapshotBuiltAt).toLocaleString("en")}.` : "Public content is still using the demo fallback until D1 build-read settings are configured."}</small>{config && !config.publishingConfigured && <p className="workspace-publish-missing">Setup needed: {config.publishMissing.join(", ")}. <Link href="/admin/api/">View setup</Link></p>}{message && <WorkspaceAlert success>{message}</WorkspaceAlert>}{error && <WorkspaceAlert>{error}</WorkspaceAlert>}</div><button type="button" className="model-button model-button-primary" disabled={busy || !config?.publishingConfigured} onClick={() => void publish()}>{busy ? <LoaderCircle className="admin-refresh-spinning" size={16} /> : <CloudUpload size={16} />}{busy ? "Queuing…" : "Publish site"}</button></section>;
}
export function useUnsavedChanges(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    let leaving = false;
    const preventLeave = (event: BeforeUnloadEvent) => { if (!leaving) { event.preventDefault(); event.returnValue = ""; } };
    const confirmNavigation = (event: MouseEvent) => {
      const anchor = (event.target as Element | null)?.closest?.("a[href]");
      if (!anchor || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || anchor.getAttribute("target") === "_blank" || anchor.hasAttribute("download")) return;
      const href = anchor.getAttribute("href"); if (!href || href.startsWith("#")) return;
      const target = new URL(href, window.location.href);
      if (target.href === window.location.href) return;
      if (!window.confirm("Leave this page and discard unsaved changes?")) { event.preventDefault(); event.stopImmediatePropagation(); }
      else leaving = true;
    };
    window.addEventListener("beforeunload", preventLeave); document.addEventListener("click", confirmNavigation, true);
    return () => { window.removeEventListener("beforeunload", preventLeave); document.removeEventListener("click", confirmNavigation, true); };
  }, [dirty]);
}

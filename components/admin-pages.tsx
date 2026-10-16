"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ChevronRight, Eye, FileText, LoaderCircle, Save, ShieldCheck } from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { useAdminSession } from "@/components/use-admin-session";
import { InformationBody } from "@/components/information-body";
import { AdminPublishing, WorkspaceAlert, WorkspaceLoading, WorkspaceSetup, useAdminResource, useUnsavedChanges } from "@/components/admin-workspace-shared";
import { AdminApiError, adminPost } from "@/lib/admin-api";
import { INFORMATION_PAGES, type InformationPage, type InformationSlug, type PlatformConfig } from "@/lib/platform";

export function AdminPages() {
  const router = useRouter(), { session, loading: sessionLoading, error: sessionError } = useAdminSession();
  const config = useAdminResource<PlatformConfig>("/api/admin/connections", Boolean(session));
  const record = useAdminResource<{ pages: InformationPage[] }>("/api/admin/pages/", Boolean(session && config.data?.migrationApplied));
  const [selected, setSelected] = useState<InformationSlug>("about"), [draft, setDraft] = useState<InformationPage | null>(null);
  const [preview, setPreview] = useState(false), [saving, setSaving] = useState(false), [error, setError] = useState(""), [notice, setNotice] = useState("");
  const errorRef = useRef<HTMLDivElement>(null);
  const saved = record.data?.pages.find((page) => page.slug === selected);
  useEffect(() => { if (saved) setDraft(saved); }, [saved]);
  useEffect(() => { if (error) errorRef.current?.focus(); }, [error]);
  const dirty = Boolean(draft && saved && JSON.stringify(draft) !== JSON.stringify(saved));
  useUnsavedChanges(dirty || saving);
  function select(slug: InformationSlug) { if (saving || dirty && !window.confirm("Discard unsaved changes to this page?")) return; setSelected(slug); setDraft(record.data?.pages.find((page) => page.slug === slug) ?? null); setPreview(false); setNotice(""); setError(""); }
  function update<K extends keyof InformationPage>(key: K, value: InformationPage[K]) {
    setDraft((current) => current ? { ...current, [key]: value, ...(["title", "description", "body"].includes(key) ? { reviewConfirmed: false } : {}) } : current); setNotice("");
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!draft || saving) return; setSaving(true); setError(""); setNotice("");
    try { const result = await adminPost<{ page: InformationPage }>("/api/admin/pages/save", draft); record.setData((current) => current ? { pages: current.pages.map((page) => page.slug === result.page.slug ? result.page : page) } : current); setNotice("Page saved. Only reviewed, public pages are included in the next successful build."); }
    catch (cause) { if (cause instanceof AdminApiError && cause.status === 401) router.replace("/admin/login/"); setError(cause instanceof Error ? cause.message : "Could not save this page. Your text is still here."); }
    finally { setSaving(false); }
  }
  const loadError = sessionError || config.error || record.error;
  return <AdminShell title="Pages" subtitle="Give visitors clear information about your website, policies and reporting process." email={session?.email}>
    {loadError && <WorkspaceAlert>{loadError}</WorkspaceAlert>}
    <div className="workspace-settings-heading"><div><p className="workspace-eyebrow">TRUST & INFORMATION</p><h2>The pages behind a professional website</h2><p>Starter copy is a private draft—not legal advice, a published policy or a fabricated contact address.</p></div><span className="workspace-settings-badge"><FileText size={15} />5 editable pages</span></div>
    {config.data && !config.data.migrationApplied ? <WorkspaceSetup /> : !record.data ? (sessionLoading || config.loading || record.loading ? <WorkspaceLoading /> : null) : <div className="workspace-pages-layout">
      <nav className="workspace-page-menu" aria-label="Information pages">{INFORMATION_PAGES.map((item) => { const page = record.data?.pages.find((page) => page.slug === item.slug); return <button key={item.slug} type="button" className={selected === item.slug ? "workspace-page-link is-active" : "workspace-page-link"} aria-current={selected === item.slug ? "page" : undefined} disabled={saving} onClick={() => select(item.slug)}><FileText size={18} /><span><strong>{item.title}</strong><small>{page?.status === "published" ? "Public · next build" : "Private draft"}</small></span><ChevronRight size={15} /></button>; })}</nav>
      {draft && <form className="workspace-pages-editor" onSubmit={save}>
        <div className="workspace-panel"><div className="workspace-panel-heading"><div><p className="workspace-eyebrow">/{draft.slug}/</p><h2>{INFORMATION_PAGES.find((page) => page.slug === selected)?.title}</h2></div><button type="button" className="model-button model-button-secondary" aria-pressed={preview} onClick={() => setPreview((value) => !value)}><Eye size={15} />{preview ? "Back to editor" : "Preview"}</button></div>
          <div className="workspace-page-editor-body">
            {notice && <WorkspaceAlert success>{notice}</WorkspaceAlert>}{error && <div tabIndex={-1} ref={errorRef}><WorkspaceAlert>{error}</WorkspaceAlert></div>}
            {preview ? <article className="workspace-page-preview"><span className="workspace-preview-label">PRIVATE PREVIEW · NOT LIVE</span><h1>{draft.title}</h1><p>{draft.description}</p><InformationBody body={draft.body} /><p className="model-field-hint">Public contact/removal addresses are added from Settings after a successful build.</p></article> : <>
              <div className="model-field"><label htmlFor="information-title">Page title <span>*</span></label><input id="information-title" required maxLength={140} disabled={saving} value={draft.title} onChange={(event) => update("title", event.target.value)} /></div>
              <div className="model-field"><label htmlFor="information-description">Search description <small>Required for public pages</small></label><textarea id="information-description" rows={2} maxLength={300} disabled={saving} value={draft.description} onChange={(event) => update("description", event.target.value)} /></div>
              <div className="model-field"><label htmlFor="information-body">Page content <small>{draft.body.length.toLocaleString("en")} / 40,000</small></label><textarea className="workspace-page-textarea" id="information-body" rows={17} maxLength={40000} disabled={saving} value={draft.body} onChange={(event) => update("body", event.target.value)} /><p className="model-field-hint">Plain text only. Leave a blank line between paragraphs; start a separate heading with ##. HTML and scripts are not allowed.</p></div>
            </>}
            <div className="workspace-review-note"><ShieldCheck size={18} /><p>Replace all starter instructions with your actual practices. Review legal/privacy terms for your jurisdiction. No policy generator can guarantee legal compliance.</p></div>
            <div className="model-fields-row"><div className="model-field"><label htmlFor="information-status">Visibility</label><select id="information-status" disabled={saving} value={draft.status} onChange={(event) => update("status", event.target.value as InformationPage["status"])}><option value="draft">Draft — private in admin</option><option value="published">Public — next successful build</option></select></div><div className="workspace-page-url"><span>Stable page address</span><code>{config.data?.publicSiteUrl}/{draft.slug}/</code></div></div>
            <label className="workspace-check"><input type="checkbox" checked={draft.reviewConfirmed} disabled={saving} onChange={(event) => update("reviewConfirmed", event.target.checked)} /><span><strong>I reviewed this page and replaced the starter instructions.</strong><small>The content accurately describes my website, contact details and actual practices.</small></span></label>
            <label className="workspace-check"><input type="checkbox" checked={draft.noindex} disabled={saving} onChange={(event) => update("noindex", event.target.checked)} /><span><strong>Keep this page out of search engines</strong><small>The public page can still be visited. This is a noindex setting, not a password or privacy control.</small></span></label>
          </div>
        </div>
        <div className="workspace-save-bar"><span>{dirty ? "Unsaved page changes" : <><CheckCircle2 size={14} />Saved in D1 · not necessarily live</>}</span><button type="submit" className="model-button model-button-primary" disabled={saving || !dirty}>{saving ? <LoaderCircle size={16} className="admin-refresh-spinning" /> : <Save size={16} />}{saving ? "Saving…" : draft.status === "draft" ? "Save draft" : "Save page"}</button></div>
      </form>}
    </div>}
    <AdminPublishing config={config.data} />
  </AdminShell>;
}

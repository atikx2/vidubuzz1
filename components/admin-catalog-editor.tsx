"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Info, LoaderCircle, Radio, Save, Search, Tags, X } from "lucide-react";
import { AdminModelPhotoPicker } from "@/components/admin-model-photo-picker";
import { useUnsavedChanges } from "@/components/admin-workspace-shared";
import { AdminApiError, adminPost } from "@/lib/admin-api";
import { catalogDescription, catalogSlug, catalogTitle, type CatalogInput, type CatalogKind, type ManagedCatalogEntry } from "@/lib/platform";

export function AdminCatalogEditor({ kind, entry, siteUrl, onClose, onSaved }: { kind: CatalogKind; entry: ManagedCatalogEntry | null; siteUrl: string; onClose: () => void; onSaved: () => void }) {
  const noun = kind === "channel" ? "Channel" : "Category", Icon = kind === "channel" ? Radio : Tags;
  const initial: CatalogInput = { ...(entry ? { id: entry.id, revision: entry.revision } : {}), kind, name: entry?.name ?? "", slug: entry?.slug ?? "",
    description: entry?.description ?? "", seoTitle: entry?.seoTitle ?? "", metaDescription: entry?.metaDescription ?? "", imageAlt: entry?.imageAlt ?? "",
    photoAssetId: entry?.photoAssetId ?? null, status: entry?.source === "demo" ? "draft" : entry?.status ?? "draft" };
  const router = useRouter(), dialog = useRef<HTMLDialogElement>(null), fallback = useRef("");
  const [values, setValues] = useState(initial), [photoUrl, setPhotoUrl] = useState<string | null>(entry?.imageUrl ?? null);
  const initialJson = useRef(JSON.stringify(initial)), [slugEdited, setSlugEdited] = useState(false);
  const [saving, setSaving] = useState(false), [uploadBusy, setUploadBusy] = useState(false), [error, setError] = useState("");
  const errorRef = useRef<HTMLParagraphElement>(null), busy = saving || uploadBusy, dirty = JSON.stringify(values) !== initialJson.current;
  useUnsavedChanges(dirty || busy);
  useEffect(() => { const el = dialog.current, focus = document.activeElement as HTMLElement | null, overflow = document.body.style.overflow;
    el?.showModal(); document.body.style.overflow = "hidden"; el?.querySelector<HTMLInputElement>("#catalog-name")?.focus();
    return () => { el?.close(); document.body.style.overflow = overflow; focus?.focus(); }; }, []);
  useEffect(() => { if (error) errorRef.current?.focus(); }, [error]);
  function update<K extends keyof CatalogInput>(key: K, value: CatalogInput[K]) { setValues((current) => ({ ...current, [key]: value })); }
  function close() { if (!busy && (!dirty || window.confirm(`Discard unsaved ${kind} changes?`))) onClose(); }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return; setError("");
    if (values.status === "published" && !values.description.trim()) { setError("Add an original introduction before making this public. Or save a draft now."); return; }
    if (values.status === "published" && kind === "channel" && !values.photoAssetId) { setError("Choose a channel photo before making it public. Or save a draft now."); return; }
    setSaving(true);
    try { await adminPost("/api/admin/catalog/save", values); onSaved(); }
    catch (cause) { if (cause instanceof AdminApiError && cause.status === 401) router.replace("/admin/login/"); setError(cause instanceof Error ? cause.message : "Could not save. Your changes are still here."); }
    finally { setSaving(false); }
  }
  const name = values.name.trim() || `${noun} name`, url = `${siteUrl}/${kind === "category" ? "categories/" : ""}${values.slug || `${kind}-name`}/`;
  return <dialog ref={dialog} className="model-editor-dialog easy-editor-dialog" aria-labelledby="catalog-editor-title" aria-describedby="catalog-editor-subtitle" onCancel={(event) => { event.preventDefault(); close(); }}><div className="model-editor-shell">
    <header className="model-editor-header"><span className="model-editor-heading-icon"><Icon size={21} /></span><div><p>{kind === "channel" ? "CHANNELS" : "CATEGORIES"}</p><h2 id="catalog-editor-title">{entry ? "Edit" : "Create"} {kind}</h2><span id="catalog-editor-subtitle">A name is enough for a draft. Finish the details later.</span></div><button className="model-editor-close" type="button" disabled={busy} onClick={close} aria-label={`Close ${kind} editor`}><X size={20} /></button></header>
    <form id="catalog-editor-form" className="model-editor-body easy-editor-body" onSubmit={submit} onInvalid={(event) => { const details = (event.target as HTMLElement).closest("details"); if (details) details.open = true; }}>
      {entry?.source === "demo" && <div className="model-editor-notice"><Info size={17} /><p>This is a fictional sample. Saving converts it to a managed draft. New managed entries have no invented video associations; video linking comes with the later video editor.</p></div>}
      {error && <p className="admin-form-error" role="alert" tabIndex={-1} ref={errorRef}>{error}</p>}
      <div className="model-field"><label htmlFor="catalog-name">{noun} name <span>*</span></label><input id="catalog-name" autoFocus required maxLength={100} autoComplete="off" placeholder={`Enter ${kind} name`} disabled={busy} value={values.name} onChange={(event) => { const name = event.target.value; fallback.current ||= crypto.randomUUID().slice(0, 8); setValues((current) => ({ ...current, name, ...(!entry && !slugEdited ? { slug: name.trim() ? catalogSlug(name, kind, fallback.current) : "" } : {}) })); }} /></div>
      <div className="model-field"><label>Thumbnail <small>{kind === "channel" ? "Optional for drafts" : "Optional"}</small></label><AdminModelPhotoPicker label={noun} purpose={kind === "channel" ? "channel-photo" : "thumbnail"} value={{ id: values.photoAssetId, url: photoUrl }} disabled={saving} onBusyChange={setUploadBusy} onChange={(photo) => { update("photoAssetId", photo.id); setPhotoUrl(photo.url); }} /></div>
      <div className="model-field"><label htmlFor="catalog-description">Short introduction <small>{values.status === "published" ? "Required for public entries" : "Optional for drafts"}</small></label><textarea id="catalog-description" rows={3} maxLength={8000} placeholder={`Describe this ${kind} using original, verified information.`} disabled={busy} value={values.description} onChange={(event) => update("description", event.target.value)} /></div>
      <details className="workspace-details"><summary><span>More options & SEO <small>Optional</small></span><ChevronDown size={17} /></summary><div className="workspace-details-body">
        <div className="model-field"><label htmlFor="catalog-slug">Page URL <small>{entry ? "Locked after creation" : "Created automatically"}</small></label><input id="catalog-slug" maxLength={80} pattern="[a-z0-9]+(-[a-z0-9]+)*" title="Lowercase letters, numbers and single hyphens" readOnly={!!entry} disabled={busy} value={values.slug} onChange={(event) => { setSlugEdited(true); update("slug", event.target.value); }} /><p className="model-field-hint model-url-hint">{url}</p></div>
        <div className="model-field"><label htmlFor="catalog-seo-title">SEO title <small>Automatic if empty</small></label><input id="catalog-seo-title" maxLength={100} disabled={busy} placeholder={catalogTitle(name)} value={values.seoTitle} onChange={(event) => update("seoTitle", event.target.value)} /></div>
        <div className="model-field"><label htmlFor="catalog-meta">Meta description <small>Automatic if empty</small></label><textarea id="catalog-meta" rows={3} maxLength={300} disabled={busy} placeholder={catalogDescription(name, values.description)} value={values.metaDescription} onChange={(event) => update("metaDescription", event.target.value)} /></div>
        <div className="model-field"><label htmlFor="catalog-alt">Image description <small>Automatic if empty</small></label><input id="catalog-alt" maxLength={160} disabled={busy} placeholder={`${name} thumbnail`} value={values.imageAlt} onChange={(event) => update("imageAlt", event.target.value)} /></div>
        <div className="model-search-preview"><p><Search size={12} />SEARCH PREVIEW</p><div className="model-search-site"><small>{url}</small></div><h4>{catalogTitle(name, values.seoTitle)}</h4><div className="model-search-description">{catalogDescription(name, values.description, values.metaDescription)}</div></div><p className="model-field-hint">Search engines can rewrite this preview. No ranking or indexing guarantee.</p>
      </div></details>
      <div className="easy-visibility"><div className="model-field"><label htmlFor="catalog-status">Save as</label><select id="catalog-status" disabled={busy} value={values.status} onChange={(event) => update("status", event.target.value as CatalogInput["status"])}><option value="draft">Draft — finish later</option><option value="published">Public — next successful build</option><option value="archived">Archived</option></select></div><p className="model-field-hint">Public changes and removals appear only after a successful build. Archiving keeps the record and its URL reservation.</p></div>
    </form>
    <footer className="model-editor-footer"><span><Save size={13} />{uploadBusy ? "Finish the upload to save" : dirty ? "Unsaved changes" : "Saved in D1, published by build"}</span><div><button type="button" className="model-button model-button-secondary" disabled={busy} onClick={close}>Cancel</button><button type="submit" form="catalog-editor-form" className="model-button model-button-primary" disabled={busy}>{saving ? <LoaderCircle size={16} className="admin-refresh-spinning" /> : <Save size={16} />}{saving ? "Saving…" : values.status === "draft" ? "Save draft" : `Save ${kind}`}</button></div></footer>
  </div></dialog>;
}

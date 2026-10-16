"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Globe2, Info, LoaderCircle, LockKeyhole, Save, Search, ShieldCheck, UserRound, X } from "lucide-react";
import { AdminModelPhotoPicker } from "@/components/admin-model-photo-picker";
import { AdminApiError, adminPost } from "@/lib/admin-api";
import { COUNTRY_OPTIONS, modelDescription, modelSeoTitle, type ManagedModel, type ModelInput, type ModelStatus } from "@/lib/models";
import { catalogSlug } from "@/lib/platform";

function initialValues(model: ManagedModel | null): ModelInput {
  return { ...(model ? { id: model.id, revision: model.revision } : {}), name: model?.name ?? "", slug: model?.slug ?? "",
    countryCode: model?.countryCode ?? null, age: model?.age ?? null, description: model?.description ?? "",
    seoTitle: model?.seoTitle ?? "", metaDescription: model?.metaDescription ?? "", imageAlt: model?.imageAlt ?? "",
    photoAssetId: model?.photoAssetId ?? null, adultConfirmed: model?.source === "admin" && model.adultConfirmed || false,
    status: model?.source === "demo" ? "draft" : model?.status ?? "draft" };
}
export function AdminModelEditor({ model, siteUrl, onClose, onSaved }: {
  model: ManagedModel | null; siteUrl: string; onClose: () => void; onSaved: (model: ManagedModel) => void;
}) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null), errorRef = useRef<HTMLParagraphElement>(null);
  const fallbackSlug = useRef("");
  const [values, setValues] = useState<ModelInput>(() => initialValues(model));
  const [photoUrl, setPhotoUrl] = useState<string | null>(model?.imageUrl ?? null);
  const [slugEdited, setSlugEdited] = useState(false), [saving, setSaving] = useState(false), [uploadBusy, setUploadBusy] = useState(false);
  const [error, setError] = useState("");
  const initial = useRef(JSON.stringify(initialValues(model)));
  const dirty = JSON.stringify(values) !== initial.current, busy = saving || uploadBusy;
  const displayName = values.name.trim() || "Model name", isPublic = values.status === "published";
  const previewTitle = modelSeoTitle(displayName, values.seoTitle), previewDescription = modelDescription(displayName, values.description, values.metaDescription);
  const previewUrl = `${siteUrl}/${values.slug || "model-name"}/`;
  useEffect(() => {
    const element = dialog.current, previousFocus = document.activeElement as HTMLElement | null, overflow = document.body.style.overflow;
    element?.showModal(); document.body.style.overflow = "hidden";
    element?.querySelector<HTMLInputElement>("#model-name")?.focus();
    return () => { element?.close(); document.body.style.overflow = overflow; previousFocus?.focus(); };
  }, []);
  useEffect(() => {
    if (!dirty && !busy) return;
    const preventLeave = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", preventLeave); return () => window.removeEventListener("beforeunload", preventLeave);
  }, [dirty, busy]);
  useEffect(() => { if (error) errorRef.current?.focus(); }, [error]);
  function update<K extends keyof ModelInput>(key: K, value: ModelInput[K]) { setValues((current) => ({ ...current, [key]: value })); }
  function requestClose() { if (!busy && (!dirty || window.confirm("Discard unsaved model changes?"))) onClose(); }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return; setError("");
    if (isPublic && !values.description.trim()) { setError("Add a short, original introduction before making this profile public. A draft does not need one."); return; }
    if (isPublic && !values.photoAssetId) { setError("Choose or upload a photo before making this profile public. Or choose Draft to save it now."); return; }
    setSaving(true);
    try { const result = await adminPost<{ model: ManagedModel }>("/api/admin/models/save", values); onSaved(result.model); }
    catch (cause) { if (cause instanceof AdminApiError && cause.status === 401) router.replace("/admin/login/"); setError(cause instanceof Error ? cause.message : "Could not save. Your changes are still here."); }
    finally { setSaving(false); }
  }
  return <dialog ref={dialog} className="model-editor-dialog easy-editor-dialog" aria-labelledby="model-editor-title" aria-describedby="model-editor-subtitle" onCancel={(event) => { event.preventDefault(); requestClose(); }}>
    <div className="model-editor-shell">
      <header className="model-editor-header"><span className="model-editor-heading-icon"><UserRound size={21} /></span><div><p>MODELS</p><h2 id="model-editor-title">{model ? "Edit model" : "Create model"}</h2><span id="model-editor-subtitle">Start with a name. Add the rest when you are ready.</span></div><button type="button" className="model-editor-close" aria-label="Close model editor" disabled={busy} onClick={requestClose}><X size={20} /></button></header>
      <form id="model-editor-form" className="model-editor-body easy-editor-body" onSubmit={submit} onInvalid={(event) => { const details = (event.target as HTMLElement).closest("details"); if (details) details.open = true; }}>
        {model?.source === "demo" && <div className="model-editor-notice"><Info size={17} /><p>This is a fictional demo. Saving makes it your managed draft. Add real information and a permitted photo before publishing.</p></div>}
        {error && <p className="admin-form-error" role="alert" tabIndex={-1} ref={errorRef}>{error}</p>}
        <div className="easy-start-note"><ShieldCheck size={17} /><span>For a draft, only the <strong>name and adult confirmation</strong> are required.</span></div>
        <div className="model-field"><label htmlFor="model-name">Model name <span>*</span></label><input id="model-name" autoFocus required maxLength={100} placeholder="Enter model name" autoComplete="off" disabled={busy} value={values.name} onChange={(event) => {
          const name = event.target.value; fallbackSlug.current ||= crypto.randomUUID().slice(0, 8);
          setValues((current) => ({ ...current, name, ...(!model && !slugEdited ? { slug: name.trim() ? catalogSlug(name, "model", fallbackSlug.current) : "" } : {}) }));
        }} /></div>
        <div className="model-field"><label>Photo <small>{isPublic ? "Needed for public profiles" : "Optional for drafts"}</small></label><AdminModelPhotoPicker value={{ id: values.photoAssetId, url: photoUrl }} disabled={saving} onBusyChange={setUploadBusy} onChange={(photo) => { update("photoAssetId", photo.id); setPhotoUrl(photo.url); }} /></div>
        <div className="model-field"><label htmlFor="model-description">Short introduction <small>{isPublic ? "Required for public profiles" : "Optional for drafts"}</small></label><textarea id="model-description" maxLength={8000} rows={3} disabled={busy} value={values.description} onChange={(event) => update("description", event.target.value)} placeholder="A few helpful, verified details about this model. You can add this later." /></div>
        <label className="model-adult-confirmation easy-adult-confirmation"><input type="checkbox" required disabled={busy} checked={values.adultConfirmed} onChange={(event) => update("adultConfirmed", event.target.checked)} /><span>I confirm this model is an <strong>adult (18+)</strong> and I have permission to use the photo and content.</span></label>
        <details className="workspace-details"><summary><span>More details & SEO <small>Optional</small></span><ChevronDown size={17} /></summary><div className="workspace-details-body">
          <div className="model-fields-row"><div className="model-field"><label htmlFor="model-country">Country <small>Optional</small></label><select id="model-country" disabled={busy} value={values.countryCode ?? ""} onChange={(event) => update("countryCode", event.target.value || null)}><option value="">Not provided</option>{COUNTRY_OPTIONS.map((country) => <option key={country.code} value={country.code}>{country.name}</option>)}</select></div><div className="model-field"><label htmlFor="model-age">Age <small>Optional · 18+</small></label><input id="model-age" type="number" inputMode="numeric" min={18} max={120} step={1} placeholder="Not provided" disabled={busy} value={values.age ?? ""} onChange={(event) => update("age", event.target.value === "" ? null : Number(event.target.value))} /></div></div>
          <p className="model-field-hint">Only add verified details. Unknown country and age stay hidden.</p>
          <div className="model-field"><label htmlFor="model-slug">Page URL <small>{model ? <><LockKeyhole size={11} /> Locked</> : "Created automatically"}</small></label><input id="model-slug" maxLength={80} pattern="[a-z0-9]+(-[a-z0-9]+)*" title="Lowercase letters, numbers and single hyphens" spellCheck={false} readOnly={!!model} disabled={busy} value={values.slug} onChange={(event) => { setSlugEdited(true); update("slug", event.target.value); }} /><p className="model-field-hint model-url-hint">{previewUrl}</p></div>
          <div className="model-field"><label htmlFor="model-seo-title">SEO title <small>Automatic if empty</small></label><input id="model-seo-title" maxLength={100} disabled={busy} value={values.seoTitle} placeholder={modelSeoTitle(displayName)} onChange={(event) => update("seoTitle", event.target.value)} /></div>
          <div className="model-field"><label htmlFor="model-meta-description">Meta description <small>Automatic if empty</small></label><textarea id="model-meta-description" maxLength={300} rows={3} disabled={busy} value={values.metaDescription} placeholder={previewDescription} onChange={(event) => update("metaDescription", event.target.value)} /></div>
          <div className="model-field"><label htmlFor="model-image-alt">Image description <small>Automatic if empty</small></label><input id="model-image-alt" maxLength={160} disabled={busy} placeholder={`${displayName} portrait`} value={values.imageAlt} onChange={(event) => update("imageAlt", event.target.value)} /></div>
          <div className="model-search-preview"><p><Search size={12} />SEARCH PREVIEW</p><div className="model-search-site"><span><Globe2 size={16} /></span><div><strong>Vidubuzz</strong><small>{previewUrl}</small></div></div><h4>{previewTitle}</h4><div className="model-search-description">{previewDescription}</div></div><p className="model-field-hint">An illustration, not an exact Google result. Rankings are not guaranteed.</p>
        </div></details>
        <div className="easy-visibility"><div className="model-field"><label htmlFor="model-status">Save as</label><select id="model-status" value={values.status} disabled={busy} onChange={(event) => update("status", event.target.value as ModelStatus)}><option value="draft">Draft — finish later</option><option value="published">Public — next successful build</option><option value="archived">Archived</option></select></div><p className="model-field-hint">{isPublic ? "Photo + introduction required. Saving does not publish the live site; queue a build when ready." : values.status === "archived" ? "Kept in admin; removed from the public site after the next successful build." : "Private in admin. No photo, biography, age, country or custom SEO needed yet."}</p></div>
      </form>
      <footer className="model-editor-footer"><span><Save size={13} />{uploadBusy ? "Finish the photo upload to save." : dirty ? "Unsaved changes" : "Your public site stays static"}</span><div><button className="model-button model-button-secondary" type="button" disabled={busy} onClick={requestClose}>Cancel</button><button className="model-button model-button-primary" form="model-editor-form" type="submit" disabled={busy}>{saving ? <LoaderCircle size={16} className="admin-refresh-spinning" /> : <Save size={16} />}{saving ? "Saving…" : values.status === "draft" ? "Save draft" : "Save model"}</button></div></footer>
    </div>
  </dialog>;
}

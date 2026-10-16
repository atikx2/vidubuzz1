"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CircleCheck, Globe2, Info, Link2, LoaderCircle, LockKeyhole, Save, Search, ShieldCheck, Sparkles, UserRound, X } from "lucide-react";
import { AdminModelPhotoPicker } from "@/components/admin-model-photo-picker";
import { AdminApiError, adminPost } from "@/lib/admin-api";
import { COUNTRY_OPTIONS, modelDescription, modelSeoTitle, slugifyModel, type ManagedModel, type ModelInput, type ModelStatus } from "@/lib/models";

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
  const dialog = useRef<HTMLDialogElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const [values, setValues] = useState<ModelInput>(() => initialValues(model));
  const [photoUrl, setPhotoUrl] = useState<string | null>(model?.imageUrl ?? null);
  const [slugEdited, setSlugEdited] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [error, setError] = useState("");
  const initial = useRef(JSON.stringify(initialValues(model)));
  const dirty = JSON.stringify(values) !== initial.current;
  const busy = saving || uploadBusy;
  const displayName = values.name.trim() || "Model name";
  const previewTitle = modelSeoTitle(displayName, values.seoTitle);
  const previewDescription = modelDescription(displayName, values.description, values.metaDescription);
  const previewUrl = `${siteUrl}/${values.slug || "model-name"}/`;

  useEffect(() => {
    const element = dialog.current;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    element?.showModal(); document.body.style.overflow = "hidden";
    // React's autoFocus can run while a newly mounted native dialog is still closed.
    element?.querySelector<HTMLInputElement>("#model-name")?.focus();
    return () => { element?.close(); document.body.style.overflow = previousOverflow; previouslyFocused?.focus(); };
  }, []);
  useEffect(() => {
    if (!dirty && !busy) return;
    const preventLeave = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", preventLeave);
    return () => window.removeEventListener("beforeunload", preventLeave);
  }, [dirty, busy]);
  useEffect(() => { if (error) errorRef.current?.focus(); }, [error]);

  function update<K extends keyof ModelInput>(key: K, value: ModelInput[K]) { setValues((current) => ({ ...current, [key]: value })); }
  function requestClose() {
    if (busy) return;
    if (dirty && !window.confirm("Discard unsaved model changes?")) return;
    onClose();
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError("");
    if (values.status === "published" && !values.photoAssetId) { setError("Choose or upload a verified R2 thumbnail before marking this model public for the next build."); return; }
    setSaving(true);
    try {
      const result = await adminPost<{ model: ManagedModel }>("/api/admin/models/save", values);
      onSaved(result.model);
    } catch (cause) {
      if (cause instanceof AdminApiError && cause.status === 401) router.replace("/admin/login/");
      setError(cause instanceof Error ? cause.message : "Could not save the model. Your changes are still here.");
    } finally { setSaving(false); }
  }

  return <dialog ref={dialog} className="model-editor-dialog" aria-labelledby="model-editor-title" aria-describedby="model-editor-subtitle" onCancel={(event) => { event.preventDefault(); requestClose(); }}>
    <div className="model-editor-shell">
      <header className="model-editor-header"><span className="model-editor-heading-icon"><UserRound size={21} /></span><div><p>MODEL WORKSPACE</p><h2 id="model-editor-title">{model ? "Edit model" : "Create model"}</h2><span id="model-editor-subtitle">{model ? "Update the profile, photo and search appearance." : "Give your next profile a great first impression."}</span></div><button type="button" className="model-editor-close" aria-label="Close model editor" disabled={busy} onClick={requestClose}><X size={20} /></button></header>
      <form ref={form} id="model-editor-form" className="model-editor-body" onSubmit={submit}>
        {model?.source === "demo" && <div className="model-editor-notice"><Info size={17} /><p>This is a fictional demo profile. Saving converts it to a managed <strong>draft</strong> unless you choose another status. To make it public, select an R2 photo and confirm adult status.</p></div>}
        {error && <p className="admin-form-error" role="alert" tabIndex={-1} ref={errorRef}>{error}</p>}
        <div className="model-editor-columns">
          <div className="model-editor-main">
            <section className="model-form-section" aria-labelledby="model-profile-section"><div className="model-section-heading"><span>01</span><div><h3 id="model-profile-section">Profile essentials</h3><p>The details people will see on the public profile.</p></div></div>
              <div className="model-field"><label htmlFor="model-name">Model name <span>*</span></label><input autoFocus id="model-name" type="text" required maxLength={100} placeholder="Enter model name" autoComplete="off" disabled={busy} value={values.name} onChange={(event) => { const name = event.target.value; setValues((current) => ({ ...current, name, ...(!model && !slugEdited ? { slug: slugifyModel(name) } : {}) })); }} /></div>
              <div className="model-field"><label htmlFor="model-slug">URL slug {model ? <small><LockKeyhole size={11} />Locked after creation</small> : <span>*</span>}</label><div className="model-input-icon"><Link2 size={15} /><input id="model-slug" type="text" required maxLength={80} pattern="[a-z0-9]+(-[a-z0-9]+)*" title="Lowercase letters, numbers and single hyphens" placeholder="model-name" spellCheck={false} readOnly={!!model} disabled={busy} value={values.slug} onChange={(event) => { setSlugEdited(true); update("slug", event.target.value); }} /></div><p className="model-field-hint model-url-hint">{previewUrl}</p></div>
              <div className="model-fields-row"><div className="model-field"><label htmlFor="model-country">Country <small>Optional</small></label><select id="model-country" disabled={busy} value={values.countryCode ?? ""} onChange={(event) => update("countryCode", event.target.value || null)}><option value="">Not provided</option>{COUNTRY_OPTIONS.map((country) => <option key={country.code} value={country.code}>{country.name}</option>)}</select></div>
                <div className="model-field"><label htmlFor="model-age">Age <small>Optional · 18+</small></label><input id="model-age" type="number" inputMode="numeric" min={18} max={120} step={1} placeholder="Not provided" disabled={busy} value={values.age ?? ""} onChange={(event) => update("age", event.target.value === "" ? null : Number(event.target.value))} /></div></div>
              <p className="model-field-hint model-optional-note">Only add verified details. Missing country and age stay hidden on the public profile.</p>
              <div className="model-field"><label htmlFor="model-description">Description <span>*</span><small>{values.description.length.toLocaleString()} / 8,000</small></label><textarea id="model-description" required maxLength={8000} rows={7} disabled={busy} value={values.description} onChange={(event) => update("description", event.target.value)} placeholder="Write a helpful, original introduction to this model. Describe their work without keyword stuffing or unsupported claims." /><p className="model-field-hint">Plain text, written for people. A unique description helps search engines understand this profile.</p></div>
            </section>
            <section className="model-form-section" aria-labelledby="model-image-section"><div className="model-section-heading"><span>02</span><div><h3 id="model-image-section">Photo & thumbnail</h3><p>A verified R2 image is required for public profiles.</p></div></div>
              <AdminModelPhotoPicker value={{ id: values.photoAssetId, url: photoUrl }} disabled={saving} onBusyChange={setUploadBusy} onChange={(photo) => { update("photoAssetId", photo.id); setPhotoUrl(photo.url); }} />
              <div className="model-field model-alt-field"><label htmlFor="model-image-alt">Image alt text <small>Optional</small></label><input id="model-image-alt" type="text" maxLength={160} disabled={busy} placeholder={`${displayName} portrait`} value={values.imageAlt} onChange={(event) => update("imageAlt", event.target.value)} /><p className="model-field-hint">Describe the actual photo. Leave empty to use the model name.</p></div>
            </section>
          </div>
          <aside className="model-editor-aside">
            <section className="model-form-section model-visibility-section" aria-labelledby="model-visibility-section"><div className="model-section-heading"><ShieldCheck size={18} /><div><h3 id="model-visibility-section">Visibility</h3><p>Control what enters the next public build.</p></div></div>
              <div className="model-field"><label htmlFor="model-status">Profile status</label><select id="model-status" value={values.status} disabled={busy} onChange={(event) => update("status", event.target.value as ModelStatus)}><option value="draft">Draft</option><option value="published">Public · next build</option><option value="archived">Archived</option></select></div>
              <p className="model-status-explanation">{values.status === "published" ? "Eligible for the next static publish build. Saving alone does not update the live site." : values.status === "archived" ? "Kept in your catalog, but excluded from the next public build. Existing pages disappear only after that build succeeds." : "Only visible in admin. Excluded from the next public build."}</p>
              <label className="model-adult-confirmation"><input type="checkbox" required disabled={busy} checked={values.adultConfirmed} onChange={(event) => update("adultConfirmed", event.target.checked)} /><span>I confirm this profile represents an <strong>adult (18+)</strong> and I have permission to use its photo and content.</span></label>
            </section>
            <section className="model-form-section model-seo-section" aria-labelledby="model-seo-section"><div className="model-section-heading"><Sparkles size={18} /><div><h3 id="model-seo-section">Search appearance</h3><p>Optional overrides. Sensible defaults included.</p></div></div>
              <div className="model-field"><label htmlFor="model-seo-title">SEO title <small>{values.seoTitle.length || previewTitle.length} / ~60</small></label><input id="model-seo-title" maxLength={100} disabled={busy} value={values.seoTitle} placeholder={modelSeoTitle(displayName)} onChange={(event) => update("seoTitle", event.target.value)} /></div>
              <div className="model-field"><label htmlFor="model-meta-description">Meta description <small>{values.metaDescription.length || previewDescription.length} / ~160</small></label><textarea id="model-meta-description" maxLength={300} rows={4} disabled={busy} value={values.metaDescription} placeholder={previewDescription} onChange={(event) => update("metaDescription", event.target.value)} /></div>
              <div className="model-search-preview"><p><Search size={12} />SEARCH RESULT PREVIEW</p><div className="model-search-site"><span><Globe2 size={16} /></span><div><strong>Vidubuzz</strong><small>{previewUrl}</small></div></div><h4>{previewTitle}</h4><div className="model-search-description">{previewDescription}</div></div>
              <p className="model-field-hint">An illustration, not an exact Google result. Search engines may rewrite titles and snippets; rankings are not guaranteed.</p>
            </section>
            <div className="model-static-note"><CircleCheck size={16} /><p>Fast by design. Public profiles are static pages; no model database request on each visit.</p></div>
          </aside>
        </div>
      </form>
      <footer className="model-editor-footer"><span><Save size={13} />{uploadBusy ? "Finish the photo upload to save." : dirty ? "You have unsaved changes" : "Saved in D1 · published by static build"}</span><div><button className="model-button model-button-secondary" type="button" disabled={busy} onClick={requestClose}>Cancel</button><button className="model-button model-button-primary" form="model-editor-form" type="submit" disabled={busy}>{saving ? <LoaderCircle size={16} className="admin-refresh-spinning" /> : <Save size={16} />}{saving ? "Saving…" : model ? "Save changes" : "Create model"}</button></div></footer>
    </div>
  </dialog>;
}

"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Check, ChevronRight, Globe2, LoaderCircle, Palette, RotateCcw, Save, Search, Settings2, ShieldCheck } from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { useAdminSession } from "@/components/use-admin-session";
import { AdminPublishing, WorkspaceAlert, WorkspaceLoading, WorkspaceSetup, useAdminResource, useUnsavedChanges } from "@/components/admin-workspace-shared";
import { AdminApiError, adminPost } from "@/lib/admin-api";
import { DEFAULT_SITE_SETTINGS, THEME_PRESETS, accentText, contrastRatio, type PlatformConfig, type SettingsRecord, type SiteSettings, type ThemeColors } from "@/lib/platform";

const tabs = [{ id: "general", label: "General", icon: Settings2 }, { id: "seo", label: "SEO & Search Console", icon: Search }, { id: "colors", label: "Colors & appearance", icon: Palette }] as const;
type Tab = (typeof tabs)[number]["id"];
const indexing = [
  { key: "indexSite", title: "Allow search engine indexing", text: "Master switch. Turning this off adds noindex headers/metadata after the next successful build. It is not access control." },
  { key: "indexModels", title: "Model profiles", text: "Allow real, public model profiles in search and the sitemap. Fictional demos stay noindex." },
  { key: "indexChannels", title: "Channel profiles", text: "Allow real, public channels in search and the sitemap." },
  { key: "indexCategories", title: "Category pages", text: "Allow real, public category pages in search and the sitemap." },
  { key: "indexPages", title: "Information pages", text: "Allow reviewed pages, unless their own noindex setting is enabled." },
] as const;
function Section({ title, note, children }: { title: string; note: string; children: React.ReactNode }) { return <section className="workspace-settings-section"><div className="workspace-section-title"><h2>{title}</h2><p>{note}</p></div>{children}</section>; }

export function AdminSettings() {
  const router = useRouter(), { session, loading: sessionLoading, error: sessionError } = useAdminSession();
  const config = useAdminResource<PlatformConfig>("/api/admin/connections", Boolean(session));
  const record = useAdminResource<SettingsRecord>("/api/admin/settings", Boolean(session && config.data?.migrationApplied));
  const [draft, setDraft] = useState<SiteSettings | null>(null), [tab, setTab] = useState<Tab>("general"), [saving, setSaving] = useState(false);
  const [error, setError] = useState(""), [notice, setNotice] = useState(""), errorRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (record.data) setDraft(record.data.settings); }, [record.data]);
  useEffect(() => { const value = new URLSearchParams(window.location.search).get("tab"); if (tabs.some((item) => item.id === value)) setTab(value as Tab); }, []);
  useEffect(() => { if (error) errorRef.current?.focus(); }, [error]);
  const dirty = Boolean(draft && record.data && JSON.stringify(draft) !== JSON.stringify(record.data.settings));
  useUnsavedChanges(dirty || saving);
  function update<K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) { setDraft((current) => current ? { ...current, [key]: value } : current); setNotice(""); }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!draft || !record.data || saving) return; setSaving(true); setError(""); setNotice("");
    try { const result = await adminPost<SettingsRecord>("/api/admin/settings", { settings: draft, revision: record.data.revision }); record.setData(result); setNotice("Settings saved in D1. Publish a successful build to update the public website."); }
    catch (cause) { if (cause instanceof AdminApiError && cause.status === 401) router.replace("/admin/login/"); setError(cause instanceof Error ? cause.message : "Settings could not be saved. Your changes are still here."); }
    finally { setSaving(false); }
  }
  const canonical = draft?.siteUrl || config.data?.publicSiteUrl || "https://vidubuzz.top";
  const safeColors = draft && Object.values(draft.theme).every((color) => /^#[a-f\d]{6}$/i.test(color)) ? draft.theme : DEFAULT_SITE_SETTINGS.theme;
  const pageContrast = contrastRatio(safeColors.text, safeColors.background), cardContrast = contrastRatio(safeColors.text, safeColors.surface);
  const loadError = sessionError || config.error || record.error;
  return <AdminShell title="Settings" subtitle="Your brand, search appearance and colors. One clear place to make it yours." email={session?.email}>
    {loadError && <WorkspaceAlert>{loadError}</WorkspaceAlert>}
    <div className="workspace-settings-heading"><div><p className="workspace-eyebrow">SITE CONTROL CENTER</p><h2>Small changes. A consistent website.</h2><p>Public changes are saved first, then applied by the next successful static build.</p></div><span className="workspace-settings-badge"><ShieldCheck size={15} />No secrets stored here</span></div>
    {config.data && !config.data.migrationApplied ? <WorkspaceSetup /> : !draft ? (sessionLoading || config.loading || record.loading ? <WorkspaceLoading /> : null) : <form id="site-settings-form" className="workspace-settings-layout" onSubmit={save}>
      <div className="workspace-settings-tabs" role="tablist" aria-label="Site settings">{tabs.map(({ id, label, icon: Icon }, index) => <button key={id} type="button" role="tab" id={`settings-tab-${id}`} aria-controls={`settings-panel-${id}`} aria-selected={tab === id} tabIndex={tab === id ? 0 : -1} className={tab === id ? "workspace-settings-tab is-active" : "workspace-settings-tab"} onClick={() => setTab(id)} onKeyDown={(event) => {
        let next: number | undefined; if (event.key === "ArrowRight" || event.key === "ArrowDown") next = (index + 1) % tabs.length; if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = (index + tabs.length - 1) % tabs.length; if (event.key === "Home") next = 0; if (event.key === "End") next = tabs.length - 1; if (next !== undefined) { event.preventDefault(); setTab(tabs[next].id); document.getElementById(`settings-tab-${tabs[next].id}`)?.focus(); }
      }}><Icon size={18} /><span>{label}</span><ChevronRight size={14} /></button>)}</div>
      <div className="workspace-settings-main">
        {notice && <WorkspaceAlert success>{notice}</WorkspaceAlert>}
        {error && <div tabIndex={-1} ref={errorRef}><WorkspaceAlert>{error}</WorkspaceAlert></div>}
        <div role="tabpanel" id={`settings-panel-${tab}`} aria-labelledby={`settings-tab-${tab}`} className="workspace-panel workspace-settings-panel">
          {tab === "general" && <>
            <Section title="Website identity" note="Use the public brand and domain you actually operate.">
              <div className="model-fields-row"><div className="model-field"><label htmlFor="site-name">Site name <span>*</span></label><input id="site-name" required maxLength={40} disabled={saving} value={draft.brandName} onChange={(event) => update("brandName", event.target.value)} /></div><div className="model-field"><label htmlFor="site-tagline">Tagline <small>Optional</small></label><input id="site-tagline" maxLength={140} disabled={saving} value={draft.tagline} onChange={(event) => update("tagline", event.target.value)} /></div></div>
              <div className="model-field"><label htmlFor="site-url">Canonical site URL <small>Optional override</small></label><input id="site-url" type="url" placeholder={config.data?.publicSiteUrl} maxLength={300} disabled={saving} value={draft.siteUrl} onChange={(event) => update("siteUrl", event.target.value)} /><p className="model-field-hint">HTTPS origin only. Leave empty to use NEXT_PUBLIC_SITE_URL. Current preview: {canonical}/</p></div>
            </Section>
            <Section title="Public contact information" note="These addresses are public after publishing. Do not enter your login password, API keys or a private address you do not want displayed.">
              <div className="model-field"><label htmlFor="public-email">Contact email <small>Optional</small></label><input id="public-email" type="email" autoComplete="off" maxLength={254} disabled={saving} placeholder="Your monitored public contact address" value={draft.publicEmail} onChange={(event) => update("publicEmail", event.target.value)} /></div>
              <div className="model-field"><label htmlFor="removal-email">Content removal email <small>Optional</small></label><input id="removal-email" type="email" autoComplete="off" maxLength={254} disabled={saving} placeholder="Your monitored rights & safety reporting address" value={draft.removalEmail} onChange={(event) => update("removalEmail", event.target.value)} /><p className="model-field-hint">Required before publishing the Content removal page. We do not invent a reporting address or promise a response time.</p></div>
            </Section>
            <Section title="Footer" note="An adult-only notice and useful links, not a visitor login."><div className="model-field"><label htmlFor="footer-text">Footer notice</label><textarea id="footer-text" rows={3} maxLength={300} disabled={saving} value={draft.footerText} onChange={(event) => update("footerText", event.target.value)} /></div><p className="model-field-hint">Only published, reviewed information pages appear as footer links. <Link href="/admin/pages/">Manage those pages →</Link></p></Section>
          </>}
          {tab === "seo" && <>
            <Section title="Homepage search appearance" note="Useful defaults with an optional custom title and description. Search engines may rewrite them.">
              <div className="model-field"><label htmlFor="home-title">SEO title <small>{draft.homeTitle.length} / ~60 recommended</small></label><input id="home-title" required maxLength={100} disabled={saving} value={draft.homeTitle} onChange={(event) => update("homeTitle", event.target.value)} /></div>
              <div className="model-field"><label htmlFor="home-description">Meta description <small>{draft.homeDescription.length} / ~160 recommended</small></label><textarea id="home-description" required maxLength={300} rows={3} disabled={saving} value={draft.homeDescription} onChange={(event) => update("homeDescription", event.target.value)} /></div>
              <div className="model-search-preview"><p><Search size={12} />SEARCH PREVIEW</p><div className="model-search-site"><span><Globe2 size={16} /></span><div><strong>{draft.brandName}</strong><small>{canonical}/</small></div></div><h4>{draft.homeTitle}</h4><div className="model-search-description">{draft.homeDescription}</div></div>
            </Section>
            <Section title="Google Search Console" note="This adds the verification meta tag. It does not connect your Google account or automatically verify ownership.">
              <div className="model-field"><label htmlFor="google-verification">Google verification content token <small>Optional</small></label><input id="google-verification" spellCheck={false} autoComplete="off" maxLength={256} disabled={saving} placeholder="Paste only the content value from Google's HTML tag method" value={draft.googleVerification} onChange={(event) => update("googleVerification", event.target.value)} /><p className="model-field-hint">Use a URL-prefix property → HTML tag. Paste only its content token, not the full meta tag or Google password.</p></div>
              <ol className="workspace-instructions"><li>Save your token here.</li><li>Publish and wait for the successful Pages deployment.</li><li>Open the canonical site and check the tag, then click Verify in Google.</li><li>Submit <code>{canonical}/sitemap.xml</code> in Search Console.</li></ol>
              <a className="model-button model-button-secondary" href={`https://search.google.com/search-console?resource_id=${encodeURIComponent(canonical + "/")}`} target="_blank" rel="noopener noreferrer">Open Search Console<ArrowUpRight size={14} /></a>
              <details className="workspace-details workspace-compact-details"><summary><span>Bing verification <small>Optional</small></span><ChevronRight size={15} /></summary><div className="workspace-details-body"><div className="model-field"><label htmlFor="bing-verification">Bing content token</label><input id="bing-verification" maxLength={256} spellCheck={false} autoComplete="off" disabled={saving} value={draft.bingVerification} onChange={(event) => update("bingVerification", event.target.value)} /></div></div></details>
            </Section>
            <Section title="Crawl & indexing controls" note="These apply after a successful build. Admin/API paths stay out of the sitemap, and drafts are never included in the public export.">{indexing.map(({ key, title, text }) => <label className="workspace-toggle-row" key={key}><span><strong>{title}</strong><small>{text}</small></span><input type="checkbox" role="switch" checked={draft[key]} disabled={saving || key !== "indexSite" && !draft.indexSite} onChange={(event) => update(key, event.target.checked)} /></label>)}<div className="workspace-utility-links"><a href={`${canonical}/robots.txt`} target="_blank" rel="noopener noreferrer">robots.txt<ArrowUpRight size={13} /></a><a href={`${canonical}/sitemap.xml`} target="_blank" rel="noopener noreferrer">sitemap.xml<ArrowUpRight size={13} /></a></div><p className="model-field-hint">No ranking, indexing or Search Console approval is guaranteed. Domain-property verification still uses DNS at your DNS provider.</p></Section>
          </>}
          {tab === "colors" && <>
            <Section title="Make it your own" note="Choose a curated palette, or customize four colors. Preview changes here before saving."><div className="workspace-theme-presets">{THEME_PRESETS.map((preset) => { const selected = JSON.stringify(preset.colors) === JSON.stringify(draft.theme); return <button key={preset.id} type="button" className={selected ? "workspace-preset is-selected" : "workspace-preset"} disabled={saving} aria-pressed={selected} onClick={() => update("theme", { ...preset.colors })}><span>{Object.values(preset.colors).map((color, index) => <i key={index} style={{ backgroundColor: color }} />)}</span><strong>{preset.name}</strong>{selected && <Check size={15} />}</button>; })}</div></Section>
            <Section title="Custom colors" note="Text must reach at least 4.5:1 contrast on both backgrounds. Accent needs 3:1 contrast against both backgrounds. Admin colors remain unchanged."><div className="workspace-color-fields">{([{ key: "accent", label: "Accent" }, { key: "background", label: "Page background" }, { key: "surface", label: "Cards & menus" }, { key: "text", label: "Text" }] as const).map(({ key, label }) => <div className="model-field" key={key}><label htmlFor={`color-${key}`}>{label}</label><div className="workspace-color-input"><input aria-label={`Choose ${label.toLowerCase()} color`} type="color" value={/^#[a-f\d]{6}$/i.test(draft.theme[key]) ? draft.theme[key] : safeColors[key]} disabled={saving} onChange={(event) => update("theme", { ...draft.theme, [key]: event.target.value })} /><input id={`color-${key}`} maxLength={7} pattern="#[a-fA-F0-9]{6}" title="Six-digit hex color, such as #f04d71" spellCheck={false} disabled={saving} value={draft.theme[key]} onChange={(event) => update("theme", { ...draft.theme, [key]: event.target.value })} /></div></div>)}</div><p className={`workspace-contrast ${pageContrast < 4.5 || cardContrast < 4.5 ? "workspace-contrast-warning" : ""}`}><ShieldCheck size={15} />Text contrast: page {pageContrast.toFixed(1)}:1 · cards {cardContrast.toFixed(1)}:1</p><button type="button" className="model-button model-button-secondary" disabled={saving} onClick={() => update("theme", { ...DEFAULT_SITE_SETTINGS.theme })}><RotateCcw size={14} />Reset colors only</button></Section>
            <Section title="Live color preview" note="An illustration of your palette, not a change to the published website."><ThemePreview theme={safeColors} name={draft.brandName} tagline={draft.tagline} /></Section>
          </>}
        </div>
        <div className="workspace-save-bar"><span>{saving ? "Saving…" : dirty ? "You have unsaved changes" : record.data?.updatedAt ? "All changes saved in D1" : "No changes yet"}</span><button type="submit" className="model-button model-button-primary" disabled={saving || !dirty}>{saving ? <LoaderCircle size={16} className="admin-refresh-spinning" /> : <Save size={16} />}Save settings</button></div>
      </div>
    </form>}
    <AdminPublishing config={config.data} />
  </AdminShell>;
}
function ThemePreview({ theme, name, tagline }: { theme: ThemeColors; name: string; tagline: string }) {
  return <div className="workspace-theme-preview" style={{ backgroundColor: theme.background, color: theme.text }}><header><span style={{ color: theme.accent }}>◆</span><strong>{name}</strong><span className="workspace-preview-label">PREVIEW</span></header><div><small style={{ color: theme.accent }}>DISCOVER SOMETHING NEW</small><h3>Your content. Your style.</h3><p>{tagline}</p><div className="workspace-preview-cards">{[0, 1, 2].map((index) => <div key={index} style={{ backgroundColor: theme.surface }}><span style={{ background: `linear-gradient(135deg, ${theme.accent}33, ${theme.surface})` }}><span style={{ backgroundColor: theme.accent, color: accentText(theme.accent) }}>▶</span></span><strong>Sample content</strong><small>Preview card</small></div>)}</div><span className="workspace-preview-button" style={{ backgroundColor: theme.accent, color: accentText(theme.accent) }}>Explore collection →</span></div></div>;
}

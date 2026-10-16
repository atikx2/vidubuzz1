"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, ArrowUpRight, CheckCircle2, ChevronLeft, ChevronRight, CloudUpload, FilePenLine, Globe2, Info, ListFilter, LoaderCircle, Plus, RefreshCw, Search, ShieldCheck, UserRound, UsersRound, X } from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { AdminModelEditor } from "@/components/admin-model-editor";
import { useAdminSession } from "@/components/use-admin-session";
import { AdminApiError, adminPost, adminRequest } from "@/lib/admin-api";
import { COUNTRY_OPTIONS, countryName, type ManagedModel, type ModelConfig, type ModelList, type ModelStatus } from "@/lib/models";

type FilterStatus = "" | ModelStatus;
const statusLabels: Record<ModelStatus, string> = { draft: "Draft", published: "Public · next build", archived: "Archived" };
const tabs: Array<{ value: FilterStatus; label: string; key: "total" | "drafts" | "published" | "archived" }> = [
  { value: "", label: "All models", key: "total" }, { value: "draft", label: "Drafts", key: "drafts" },
  { value: "published", label: "Public", key: "published" }, { value: "archived", label: "Archived", key: "archived" },
];
function dateLabel(value: string | null) { return value ? new Date(value).toLocaleDateString("en", { day: "numeric", month: "short", year: "numeric" }) : "Not built from D1 yet"; }
function initials(name: string) { return name.trim().split(/\s+/).slice(0, 2).map((word) => word[0]).join("").toUpperCase(); }

export function AdminModels() {
  const router = useRouter();
  const { session, loading: sessionLoading, error: sessionError } = useAdminSession();
  const [config, setConfig] = useState<ModelConfig | null>(null);
  const [list, setList] = useState<ModelList | null>(null);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<FilterStatus>("");
  const [country, setCountry] = useState("");
  const [sort, setSort] = useState("recent");
  const [page, setPage] = useState(1);
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [editor, setEditor] = useState<ManagedModel | null | undefined>(undefined);

  useEffect(() => {
    const timer = window.setTimeout(() => { setQuery(search.trim()); setPage(1); }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    if (!session) return;
    const controller = new AbortController();
    void adminRequest<ModelConfig>("/api/admin/models/config", { signal: controller.signal })
      .then((result) => { if (!controller.signal.aborted) setConfig(result); })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        if (cause instanceof AdminApiError && cause.status === 401) router.replace("/admin/login/");
        else setError(cause instanceof Error ? cause.message : "Model setup could not be loaded.");
      });
    return () => controller.abort();
  }, [session, router, refresh]);
  useEffect(() => {
    if (!session || !config?.migrationApplied) { if (config && !config.migrationApplied) setLoading(false); return; }
    const controller = new AbortController();
    setLoading(true); setError("");
    const params = new URLSearchParams({ page: String(page), sort, ...(query ? { q: query } : {}), ...(status ? { status } : {}), ...(country ? { country } : {}) });
    void adminRequest<ModelList>(`/api/admin/models/?${params}`, { signal: controller.signal })
      .then((result) => {
        if (controller.signal.aborted) return;
        if (page > result.totalPages) { setPage(result.totalPages); return; }
        setList(result);
      }).catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        if (cause instanceof AdminApiError && cause.status === 401) router.replace("/admin/login/");
        else setError(cause instanceof Error ? cause.message : "Models could not be loaded.");
      }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [session, config?.migrationApplied, page, query, status, country, sort, refresh, router]);

  function saved(model: ManagedModel) {
    setEditor(undefined); setNotice(`${model.name} saved. ${model.status === "published" ? "Eligible for the next public build." : "Excluded from the next public build."} Publish when your changes are ready; the current live deployment has not changed.`);
    setRefresh((value) => value + 1);
  }
  async function publish() {
    if (publishing || !config?.publishingConfigured) return;
    if (!window.confirm("Queue a static build for all public models, channels, categories, saved settings and reviewed pages? Drafts stay private. The live site changes only after the build succeeds.")) return;
    setPublishing(true); setError(""); setNotice("");
    try {
      const result = await adminPost<{ message: string }>("/api/admin/models/publish");
      setNotice(result.message);
    } catch (cause) {
      if (cause instanceof AdminApiError && cause.status === 401) router.replace("/admin/login/");
      setError(cause instanceof Error ? cause.message : "Static publish could not be queued.");
    } finally { setPublishing(false); }
  }
  function clearFilters() { setSearch(""); setQuery(""); setStatus(""); setCountry(""); setPage(1); }
  const activeFilters = !!(query || status || country);
  const ready = !!session && !!config?.migrationApplied;
  const stats = list?.stats;

  return <AdminShell title="Models" subtitle="A thoughtful profile for every face in your catalog." email={session?.email}>
    {(sessionError || error) && <p className="admin-form-error model-page-alert" role="alert">{sessionError || error}</p>}
    {notice && <div className="admin-form-success model-page-alert" role="status"><CheckCircle2 size={17} /><span>{notice}</span><button type="button" aria-label="Dismiss notification" onClick={() => setNotice("")}><X size={15} /></button></div>}
    <section className="model-workspace-hero" aria-labelledby="model-catalog-title"><div className="model-workspace-symbol"><UsersRound size={28} strokeWidth={1.5} /><span /></div><div><p>YOUR TALENT, BEAUTIFULLY ORGANIZED</p><h2 id="model-catalog-title">The model collection<span>.</span></h2><p>Standout portraits. Helpful profiles. Ready for discovery.</p></div><button className="model-button model-button-primary" type="button" disabled={!ready} onClick={() => setEditor(null)}><Plus size={17} />Create Model</button></section>

    <div className="model-summary-grid" aria-label="Model catalog overview">{[
      { label: "Total models", value: stats?.total, caption: "Your complete catalog", icon: UsersRound, tone: "rose" },
      { label: "Public selection", value: stats?.published, caption: "Eligible for next build", icon: Globe2, tone: "teal" },
      { label: "Draft profiles", value: stats?.drafts, caption: "A work in progress", icon: FilePenLine, tone: "violet" },
      { label: "Archived", value: stats?.archived, caption: "Kept out of next build", icon: Archive, tone: "amber" },
    ].map(({ label, value, caption, icon: Icon, tone }) => <div className={`model-summary-card model-summary-${tone}`} key={label}><span><Icon size={18} strokeWidth={1.7} /></span><div><p>{label}</p><strong>{value === undefined ? "—" : value.toLocaleString()}</strong><small>{caption}</small></div></div>)}</div>

    {config && !config.migrationApplied && <section className="admin-config-alert model-migration-alert"><ShieldCheck size={20} /><div><strong>One-time model database setup</strong><p>Apply <code>migrations/0003_models.sql</code> to your existing D1 database after migration 0002. Then refresh this page. Existing admin login and R2 uploads are unchanged.</p><button type="button" className="model-button model-button-secondary" onClick={() => setRefresh((n) => n + 1)}><RefreshCw size={13} />Check again</button></div></section>}

    <section className="model-catalog-panel" aria-labelledby="model-list-heading">
      <div className="model-list-topline"><div><h2 id="model-list-heading">All models <span>{stats?.total ?? "—"}</span></h2><p>Manage profile details, thumbnails and visibility.</p></div><button className="admin-media-icon-button" type="button" aria-label="Refresh models" disabled={!ready || loading} onClick={() => setRefresh((value) => value + 1)}><RefreshCw size={16} className={loading && ready ? "admin-refresh-spinning" : ""} /></button></div>
      <div className="model-toolbar"><div className="model-search-input"><Search size={16} /><input type="search" aria-label="Search models by name or slug" placeholder="Search models…" value={search} maxLength={100} disabled={!ready} onChange={(event) => setSearch(event.target.value)} /></div><div className="model-toolbar-select"><Globe2 size={14} /><select aria-label="Filter models by country" disabled={!ready} value={country} onChange={(event) => { setCountry(event.target.value); setPage(1); }}><option value="">All countries</option>{COUNTRY_OPTIONS.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}</select></div><div className="model-toolbar-select model-sort-select"><ListFilter size={14} /><select aria-label="Sort models" disabled={!ready} value={sort} onChange={(event) => { setSort(event.target.value); setPage(1); }}><option value="recent">Recently updated</option><option value="name">Name A–Z</option></select></div></div>
      <div className="model-tabs-row"><div className="model-status-tabs" role="group" aria-label="Filter model visibility">{tabs.map((tab) => <button type="button" key={tab.key} aria-pressed={status === tab.value} className={status === tab.value ? "model-tab model-tab-active" : "model-tab"} disabled={!ready} onClick={() => { setStatus(tab.value); setPage(1); }}>{tab.label}<span>{stats?.[tab.key] ?? "—"}</span></button>)}</div>{activeFilters && <button className="model-clear-filters" type="button" onClick={clearFilters}><X size={12} />Clear</button>}</div>
      <div className="model-catalog-content" aria-busy={loading && ready}>
        {(sessionLoading || loading && ready) && !list ? <div className="model-card-grid model-skeleton-grid" aria-label="Loading models">{Array.from({ length: 6 }, (_, index) => <div className="model-skeleton-card" key={index}><div /><span /><small /></div>)}</div> : list?.models.length ? <>
          {loading && <div className="model-list-loading" role="status"><LoaderCircle size={13} className="admin-refresh-spinning" />Updating collection…</div>}
          <div className={`model-card-grid ${loading ? "model-cards-loading" : ""}`}>{list.models.map((model) => <article className="model-profile-card" key={model.id}>
            <button className="model-card-photo" type="button" aria-label={`Edit ${model.name}`} disabled={loading} onClick={() => setEditor(model)}><span className="model-card-initials">{initials(model.name)}</span>{model.imageUrl && <img key={model.imageUrl} src={model.imageUrl} alt={model.imageAlt || `${model.name} portrait`} loading="lazy" decoding="async" onError={(event) => { event.currentTarget.style.opacity = "0"; }} />}<span className="model-card-photo-shade" /><span className={`model-status-pill model-status-${model.status}`}><i />{statusLabels[model.status]}</span>{model.source === "demo" && <span className="model-demo-pill">FICTIONAL DEMO</span>}<span className="model-photo-edit-hint"><FilePenLine size={14} />Edit profile</span></button>
            <div className="model-card-content"><div className="model-card-name"><h3>{model.name}</h3>{model.photoAssetId && <ShieldCheck size={14} aria-label="R2 image selected" />}</div><span className="model-card-slug">/{model.slug}/</span><div className="model-card-details">{model.countryCode && <span><Globe2 size={12} />{countryName(model.countryCode)}</span>}{model.age !== null && <span>{model.age} years</span>}{!model.countryCode && model.age === null && <span className="model-details-empty">Country & age not provided</span>}</div><p className="model-card-description">{model.description || "Draft started. Add a photo and introduction whenever you are ready."}</p><div className="model-card-bottom"><span>Updated {dateLabel(model.updatedAt)}</span><button type="button" aria-label={`Edit ${model.name} profile`} disabled={loading} onClick={() => setEditor(model)}><FilePenLine size={13} />Edit</button></div></div>
          </article>)}</div></> : <div className="model-empty-state"><span>{activeFilters ? <Search size={28} /> : <UserRound size={28} />}</span><h3>{!ready ? config && !config.migrationApplied ? "Your catalog is almost ready" : "Connecting to your catalog…" : activeFilters ? "No models found" : "Meet your next great profile"}</h3><p>{!ready ? "Complete the database setup to start managing models." : activeFilters ? "Try a different name, country or visibility filter." : "Create your first model, add a beautiful thumbnail and tell their story."}</p>{ready && <button className="model-button model-button-secondary" type="button" onClick={activeFilters ? clearFilters : () => setEditor(null)}>{activeFilters ? <X size={14} /> : <Plus size={14} />}{activeFilters ? "Clear filters" : "Create Model"}</button>}</div>}
      </div>
      {list && <div className="model-list-pagination"><span>{list.total ? `${(list.page - 1) * 12 + 1}–${Math.min(list.page * 12, list.total)} of ${list.total}` : "0 models"}</span><div><button type="button" aria-label="Previous model page" disabled={page <= 1 || loading} onClick={() => setPage((n) => n - 1)}><ChevronLeft size={15} /></button><span>Page {list.page} of {list.totalPages}</span><button type="button" aria-label="Next model page" disabled={page >= list.totalPages || loading} onClick={() => setPage((n) => n + 1)}><ChevronRight size={15} /></button></div></div>}
    </section>

    <section className="model-publishing-panel" aria-labelledby="model-publish-title"><span className="model-publish-icon"><CloudUpload size={22} /></span><div><p>STATIC PUBLISHING</p><h2 id="model-publish-title">Save first. Publish when ready.</h2><p>Changes stay in D1 until a successful site build. Public profiles load as fast static pages, with photos delivered by R2.</p><span className="model-build-label"><i />{config?.snapshotSource === "d1" ? `This deployment’s model snapshot: ${dateLabel(config.snapshotBuiltAt)}` : "This deployment uses the existing demo catalog"}</span></div><button className="model-button model-button-secondary" type="button" disabled={!config?.publishingConfigured || publishing} title={!config?.publishingConfigured ? "Complete the one-time static publishing setup below" : "Queue a static Pages build"} onClick={() => void publish()}>{publishing ? <LoaderCircle size={15} className="admin-refresh-spinning" /> : <CloudUpload size={16} />}{publishing ? "Queuing…" : "Publish site"}</button>
      {config && !config.publishingConfigured && <details className="model-publish-setup"><summary><Info size={14} />One-time publishing setup<span>View details</span></summary><div><p>Missing settings: <strong>{config.publishMissing.join(", ") || "Model database migration"}</strong>.</p><p>Configure build-only D1 read access and a private Pages deploy hook for this branch/environment. Open <Link href="/admin/api/">API & Connections</Link> for one-tap SQL copy and setup instructions. Never paste tokens or hook URLs into chat or public code.</p><p>Until then, you can save and organize models in admin, but a build without the D1 settings will continue using the demo catalog.</p></div></details>}
    </section>
    <p className="admin-dashboard-footnote"><ShieldCheck size={14} /><span>Admin-only editing · Adult profiles only · No invented personal details. <Link href="/pornstars/" target="_blank" className="model-footnote-link">Open current public directory<ArrowUpRight size={11} /></Link></span></p>
    {editor !== undefined && <AdminModelEditor key={editor?.id || "new-model"} model={editor} siteUrl={config?.publicSiteUrl || "https://vidubuzz.top"} onClose={() => setEditor(undefined)} onSaved={saved} />}
  </AdminShell>;
}

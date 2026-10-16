"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, ListFilter } from "lucide-react";
import { Pagination } from "@/components/pagination";
import { performers } from "@/lib/public-model-cards";
import { countryName } from "@/lib/models";
import { siteContent } from "@/lib/site-content";

type PerformerSort = "popular" | "latest";
const PAGE_SIZE = 24;
export function PerformerDirectory() {
  const [sortMode, setSortMode] = useState<PerformerSort>("popular");
  const [page, setPage] = useState(1);
  const sortedPerformers = useMemo(() => {
    const items = [...performers];
    if (sortMode === "latest") return items.sort((a, b) => (b.createdAt ?? String(b.id)).localeCompare(a.createdAt ?? String(a.id)));
    // Stable ties preserve the build index order across browser/server locales.
    return items.sort((a, b) => b.videoCount - a.videoCount);
  }, [sortMode]);
  const totalPages = Math.max(1, Math.ceil(sortedPerformers.length / PAGE_SIZE));
  const visiblePerformers = sortedPerformers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <section className="performer-directory" aria-labelledby="performer-page-title">
      <div className="section-heading performer-directory-heading">
        <div className="section-heading-copy">
          <div className="section-title-line"><span className="section-marker" /><h1 id="performer-page-title">{siteContent.performersPageTitle}</h1></div>
          <p>{siteContent.performersPageSubtitle}</p>
        </div>
        <label className="video-filter performer-filter" htmlFor="performer-sort">
          <ListFilter size={15} className="video-filter-icon" aria-hidden="true" />
          <span className="filter-caption">{siteContent.channelFilterLabel}</span>
          <select id="performer-sort" value={sortMode} onChange={(event) => { setSortMode(event.target.value as PerformerSort); setPage(1); }} aria-label={siteContent.performersPageFilterAriaLabel}>
            <option value="popular">{siteContent.popularChannelsLabel}</option><option value="latest">{siteContent.latestPerformersLabel}</option>
          </select><ChevronDown size={14} className="video-filter-chevron" aria-hidden="true" />
        </label>
      </div>
      <div className="directory-channel-grid directory-performer-grid">
        {visiblePerformers.map((performer, index) => (
          <Link className="directory-channel-card" href={`/${performer.slug}/`} key={performer.id}>
            <div className={`directory-channel-avatar directory-avatar-${(index % 3) + 1}`}><img src={performer.image} alt={performer.imageAlt || `${performer.name} portrait`} width="240" height="240" loading="lazy" decoding="async" /><span className="directory-avatar-ring" /></div>
            <div className="directory-channel-copy"><h2>{performer.name}</h2><p>{performer.videos}</p>{performer.countryCode && <span className="performer-directory-country">{countryName(performer.countryCode)}</span>}{performer.source === "demo" && <span className="performer-directory-demo">Fictional demo</span>}</div>
          </Link>
        ))}
      </div>
      {!visiblePerformers.length && <p className="performer-empty-directory">New model profiles are on the way. Check back soon.</p>}
      {totalPages > 1 && <Pagination totalPages={totalPages} page={page} onPageChange={(next) => setPage(next)} />}
      <section className="seo-copy performer-seo-copy" aria-labelledby="performer-seo-heading"><h2 id="performer-seo-heading">{siteContent.performersPageSeoHeading}</h2><p>{siteContent.performersPageSeoDescription}</p></section>
    </section>
  );
}

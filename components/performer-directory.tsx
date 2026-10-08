"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, ListFilter } from "lucide-react";
import { Pagination } from "@/components/pagination";
import { performers } from "@/lib/demo-content";
import { siteContent } from "@/lib/site-content";

type PerformerSort = "popular" | "latest";

export function PerformerDirectory() {
  const [sortMode, setSortMode] = useState<PerformerSort>("popular");
  const sortedPerformers = useMemo(() => {
    const items = [...performers];
    if (sortMode === "latest") return items.sort((a, b) => b.id - a.id);
    return items.sort((a, b) => b.videoCount - a.videoCount);
  }, [sortMode]);

  return (
    <section className="performer-directory" aria-labelledby="performer-page-title">
      <div className="section-heading performer-directory-heading">
        <div className="section-heading-copy">
          <div className="section-title-line">
            <span className="section-marker" />
            <h1 id="performer-page-title">{siteContent.performersPageTitle}</h1>
          </div>
          <p>{siteContent.performersPageSubtitle}</p>
        </div>
        <label className="video-filter performer-filter" htmlFor="performer-sort">
          <ListFilter size={15} className="video-filter-icon" aria-hidden="true" />
          <span className="filter-caption">{siteContent.channelFilterLabel}</span>
          <select
            id="performer-sort"
            value={sortMode}
            onChange={(event) => setSortMode(event.target.value as PerformerSort)}
            aria-label={siteContent.performersPageFilterAriaLabel}
          >
            <option value="popular">{siteContent.popularChannelsLabel}</option>
            <option value="latest">{siteContent.latestPerformersLabel}</option>
          </select>
          <ChevronDown size={14} className="video-filter-chevron" aria-hidden="true" />
        </label>
      </div>

      <div className="directory-channel-grid directory-performer-grid">
        {sortedPerformers.map((performer, index) => (
          <Link className="directory-channel-card" href={`/${performer.slug}/`} key={performer.id}>
            <div className={`directory-channel-avatar directory-avatar-${(index % 3) + 1}`}>
              <img src={performer.image} alt="" width="240" height="135" loading="lazy" decoding="async" />
              <span className="directory-avatar-ring" />
            </div>
            <div className="directory-channel-copy">
              <h2>{performer.name}</h2>
              <p>{performer.videos}</p>
            </div>
          </Link>
        ))}
      </div>

      <Pagination totalPages={21} />

      <section className="seo-copy performer-seo-copy" aria-labelledby="performer-seo-heading">
        <h2 id="performer-seo-heading">{siteContent.performersPageSeoHeading}</h2>
        <p>{siteContent.performersPageSeoDescription}</p>
      </section>
    </section>
  );
}

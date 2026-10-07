"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, ListFilter } from "lucide-react";
import { Pagination } from "@/components/pagination";
import { channelDirectory } from "@/lib/demo-content";
import { siteContent } from "@/lib/site-content";

type ChannelSort = "popular" | "latest";

export function ChannelDirectory() {
  const [sortMode, setSortMode] = useState<ChannelSort>("popular");
  const sortedChannels = useMemo(() => {
    const items = [...channelDirectory];
    if (sortMode === "latest") return items.sort((a, b) => b.id - a.id);
    return items.sort((a, b) => b.videoCount - a.videoCount);
  }, [sortMode]);

  return (
    <section className="channel-directory" aria-labelledby="channel-page-title">
      <div className="section-heading channel-directory-heading">
        <div className="section-heading-copy">
          <div className="section-title-line">
            <span className="section-marker" />
            <h1 id="channel-page-title">{siteContent.channelPageTitle}</h1>
          </div>
          <p>{siteContent.channelPageSubtitle}</p>
        </div>
        <label className="video-filter channel-filter" htmlFor="channel-sort">
          <ListFilter size={15} className="video-filter-icon" aria-hidden="true" />
          <span className="filter-caption">{siteContent.channelFilterLabel}</span>
          <select
            id="channel-sort"
            value={sortMode}
            onChange={(event) => setSortMode(event.target.value as ChannelSort)}
            aria-label={siteContent.channelFilterAriaLabel}
          >
            <option value="popular">{siteContent.popularChannelsLabel}</option>
            <option value="latest">{siteContent.latestChannelsLabel}</option>
          </select>
          <ChevronDown size={14} className="video-filter-chevron" aria-hidden="true" />
        </label>
      </div>

      <div className="directory-channel-grid">
        {sortedChannels.map((channel, index) => (
          <Link className="directory-channel-card" href={`/${channel.slug}/`} key={channel.id}>
            <div className={`directory-channel-avatar directory-avatar-${(index % 3) + 1}`}>
              <img src={channel.image} alt="" width="240" height="135" loading="lazy" decoding="async" />
              <span className="directory-avatar-ring" />
            </div>
            <div className="directory-channel-copy">
              <h2>{channel.name}</h2>
              <p>{channel.videos}</p>
            </div>
          </Link>
        ))}
      </div>

      <Pagination totalPages={21} />

      <section className="seo-copy channel-seo-copy" aria-labelledby="channel-seo-heading">
        <h2 id="channel-seo-heading">{siteContent.channelPageSeoHeading}</h2>
        <p>{siteContent.channelPageSeoDescription}</p>
      </section>
    </section>
  );
}

"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, Clock3, ListFilter, Play, Sparkles } from "lucide-react";
import type { Video } from "@/lib/demo-content";
import { siteContent } from "@/lib/site-content";

type RelatedVideosProps = { videos: Video[] };

export function RelatedVideos({ videos }: RelatedVideosProps) {
  const [sortMode, setSortMode] = useState<"best" | "latest">("best");
  const sortedVideos = useMemo(() => {
    const items = [...videos];
    return sortMode === "latest"
      ? items.sort((a, b) => a.hoursAgo - b.hoursAgo)
      : items.sort((a, b) => b.viewCount - a.viewCount);
  }, [videos, sortMode]);

  return (
    <section className="related-videos-section" aria-labelledby="related-videos-heading">
      <div className="section-heading related-videos-heading">
        <div className="section-heading-copy">
          <div className="section-title-line">
            <span className="section-marker" />
            <h2 id="related-videos-heading">Related videos</h2>
          </div>
          <p>More videos you may like</p>
        </div>
        <label className="video-filter" htmlFor="related-video-sort">
          <ListFilter size={15} className="video-filter-icon" aria-hidden="true" />
          <span className="filter-caption">{siteContent.videoFilterLabel}</span>
          <select id="related-video-sort" value={sortMode} onChange={(event) => setSortMode(event.target.value as "best" | "latest")} aria-label="Sort related videos">
            <option value="best">{siteContent.bestVideoLabel}</option>
            <option value="latest">{siteContent.latestVideoLabel}</option>
          </select>
          <ChevronDown size={14} className="video-filter-chevron" aria-hidden="true" />
        </label>
      </div>
      <div className="video-grid related-video-grid">
        {sortedVideos.map((video, position) => (
          <article className="video-card" key={video.id}>
            <Link className="video-cover" href={`/video/${video.id}/`} aria-label={`Watch ${video.title}`}>
              <picture>
                <source srcSet={`${video.imageSmall} 240w, ${video.image} 360w`} sizes="(max-width: 600px) 100vw, (max-width: 1100px) 50vw, 25vw" />
                <img src={video.image} alt={`Preview for ${video.title}`} width="360" height="203" loading={position < 2 ? "eager" : "lazy"} decoding="async" />
              </picture>
              <span className="cover-shade" />
              <span className="cover-topline"><span className="cover-quality"><Sparkles size={10} /> HD</span><span className="cover-views">{video.views} views</span></span>
              <span className="cover-play"><Play size={18} fill="currentColor" /></span>
              <span className="cover-duration">{video.duration}</span>
              <span className={`cover-glow glow-${video.accent}`} />
            </Link>
            <div className="video-card-info">
              <h3 className="video-title" title={video.title}><Link href={`/video/${video.id}/`}>{video.title}</Link></h3>
              <div className="related-video-subline"><span>{video.channel}</span><i>•</i><span>{video.performer}</span><i>•</i><span><Clock3 size={12} />{video.age}</span></div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

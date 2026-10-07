"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ListFilter, Play, Radio, Sparkles, UserRound } from "lucide-react";
import { Pagination } from "@/components/pagination";
import { videos, type Video } from "@/lib/demo-content";
import { siteContent } from "@/lib/site-content";

type SortMode = "best" | "latest";

function VideoCard({ video, position }: { video: Video; position: number }) {
  return (
    <article id={`video-${video.id}`} className="video-card">
      <div className="video-cover">
        <picture>
          <source
            srcSet={`${video.imageSmall} 240w, ${video.image} 360w`}
            sizes="(max-width: 600px) 100vw, (max-width: 1100px) 50vw, 25vw"
          />
          <img
            src={video.image}
            alt={`Cinematic preview for ${video.title}`}
            width="360"
            height="203"
            loading={position < 2 ? "eager" : "lazy"}
            fetchPriority={position === 0 ? "high" : undefined}
            decoding="async"
          />
        </picture>
        <span className="cover-shade" />
        <span className="cover-topline">
          <span className="cover-quality"><Sparkles size={10} /> HD</span>
          <span className="cover-views">{video.views} views</span>
        </span>
        <span className="cover-play"><Play size={18} fill="currentColor" /></span>
        <span className="cover-duration">{video.duration}</span>
        <span className={`cover-glow glow-${video.accent}`} />
      </div>
      <div className="video-card-info">
        <h3 className="video-title" title={video.title}>{video.title}</h3>
        <div className="creator-scroll" tabIndex={0} aria-label={`Channel ${video.channel}; models ${video.actors.join(", ")}`}>
          <span className="creator-chip channel-chip">
            <span className="mini-avatar channel-avatar"><Radio size={12} strokeWidth={2.1} /></span>
            <span>{video.channel}</span>
          </span>
          {video.actors.map((actor) => (
            <span className="creator-chip model-chip" key={actor}>
              <span className="mini-avatar model-avatar"><UserRound size={12} strokeWidth={2.1} /></span>
              <span>{actor}</span>
            </span>
          ))}
        </div>
      </div>
    </article>
  );
}

export function VideoListing() {
  const [sortMode, setSortMode] = useState<SortMode>("best");
  const sortedVideos = useMemo(() => {
    const items = [...videos];
    if (sortMode === "latest") {
      return items.sort((a, b) => a.hoursAgo - b.hoursAgo);
    }
    return items.sort((a, b) => b.viewCount - a.viewCount);
  }, [sortMode]);

  return (
    <section className="video-section" aria-labelledby="trending-videos">
      <div className="section-heading">
        <div className="section-heading-copy">
          <div className="section-title-line">
            <span className="section-marker" />
            <h1 id="trending-videos">{siteContent.videosHeading}</h1>
          </div>
          <p>{siteContent.videosDescription}</p>
        </div>
        <label className="video-filter" htmlFor="video-sort">
          <ListFilter size={15} className="video-filter-icon" aria-hidden="true" />
          <span className="filter-caption">{siteContent.videoFilterLabel}</span>
          <select
            id="video-sort"
            value={sortMode}
            onChange={(event) => setSortMode(event.target.value as SortMode)}
            aria-label={siteContent.videoFilterAriaLabel}
          >
            <option value="best">{siteContent.bestVideoLabel}</option>
            <option value="latest">{siteContent.latestVideoLabel}</option>
          </select>
          <ChevronDown size={14} className="video-filter-chevron" aria-hidden="true" />
        </label>
      </div>
      <div className="video-grid">
        {sortedVideos.map((video, position) => (
          <VideoCard video={video} position={position} key={video.id} />
        ))}
      </div>
      <Pagination />
    </section>
  );
}

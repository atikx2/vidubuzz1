"use client";

import { useState } from "react";
import Link from "next/link";
import { Clock3, Eye, ThumbsDown, ThumbsUp } from "lucide-react";
import type { Video } from "@/lib/demo-content";
import { categoryDirectory, channelDirectory, performers } from "@/lib/demo-content";

export function VideoPageInfo({ video }: { video: Video }) {
  const [reaction, setReaction] = useState<"like" | "dislike" | null>(null);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const channel = channelDirectory.find((item) => item.name === video.channel);
  const performer = performers.find((item) => item.name === video.performer);
  const categories = video.categories
    .map((slug) => categoryDirectory.find((item) => item.slug === slug))
    .filter((item) => item !== undefined);

  return (
    <section className="video-page-info" aria-labelledby="video-page-title">
      <h1 id="video-page-title">{video.title}</h1>
      <div className="video-page-stats-row">
        <div className="video-reactions" aria-label="Video reactions">
          <button
            className={`video-reaction-button ${reaction === "like" ? "video-reaction-active" : ""}`}
            type="button"
            aria-label="Like video"
            aria-pressed={reaction === "like"}
            onClick={() => setReaction((current) => current === "like" ? null : "like")}
          >
            <ThumbsUp size={17} /> <span>{video.likes}</span>
          </button>
          <button
            className={`video-reaction-button ${reaction === "dislike" ? "video-reaction-active" : ""}`}
            type="button"
            aria-label="Dislike video"
            aria-pressed={reaction === "dislike"}
            onClick={() => setReaction((current) => current === "dislike" ? null : "dislike")}
          >
            <ThumbsDown size={17} /> <span>{video.dislikes}</span>
          </button>
        </div>
        <div className="video-page-meta">
          <span><Eye size={16} aria-hidden="true" />{video.views} views</span>
          <span><Clock3 size={15} aria-hidden="true" />{video.age}</span>
        </div>
      </div>

      <div className="video-credit-row">
        {channel ? (
          <Link className="video-credit-person" href={`/${channel.slug}/`}>
            <span className="video-credit-avatar"><img src={channel.image} alt="" width="240" height="135" /></span>
            <span className="video-credit-copy"><small>Channel</small><strong>{channel.name}</strong></span>
          </Link>
        ) : (
          <div className="video-credit-person">
            <span className="video-credit-avatar"><img src={video.imageSmall} alt="" width="240" height="135" /></span>
            <span className="video-credit-copy"><small>Channel</small><strong>{video.channel}</strong></span>
          </div>
        )}

        {performer ? (
          <Link className="video-credit-person" href={`/${performer.slug}/`}>
            <span className="video-credit-avatar performer-credit-avatar"><img src={performer.image} alt="" width="240" height="135" /></span>
            <span className="video-credit-copy"><small>Pornstar</small><strong>{performer.name}</strong></span>
          </Link>
        ) : (
          <div className="video-credit-person">
            <span className="video-credit-avatar performer-credit-avatar"><img src={video.imageSmall} alt="" width="240" height="135" /></span>
            <span className="video-credit-copy"><small>Pornstar</small><strong>{video.performer}</strong></span>
          </div>
        )}
      </div>

      <div className="video-categories-row" aria-label="Video categories">
        {categories.map((category, index) => (
          <span className="video-category-item" key={category.slug}>
            {index > 0 && <span className="video-category-dot" aria-hidden="true">•</span>}
            <Link href={`/categories/${category.slug}/`}>{category.name}</Link>
          </span>
        ))}
      </div>

      <div className={`video-description-card ${descriptionExpanded ? "video-description-expanded" : ""}`}>
        <p>{video.description}</p>
        <button type="button" className="channel-description-toggle" aria-expanded={descriptionExpanded} onClick={() => setDescriptionExpanded((expanded) => !expanded)}>
          {descriptionExpanded ? "Show less" : "Show more"}
        </button>
        <div className="video-seo-tags">
          <span>Tags:</span>
          {categories.map((category) => <Link href={`/categories/${category.slug}/`} key={category.slug}>#{category.name.replace(/\s+/g, "")}</Link>)}
          {performer && <Link href={`/${performer.slug}/`}>#{performer.name.replace(/\s+/g, "")}</Link>}
          {channel && <Link href={`/${channel.slug}/`}>#{channel.name.replace(/\s+/g, "")}</Link>}
        </div>
      </div>
    </section>
  );
}

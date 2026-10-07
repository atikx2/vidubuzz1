"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Play,
  Radio,
  Sparkles,
  Star,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { channels, performers, videos, type Video } from "@/lib/demo-content";
import { siteContent } from "@/lib/site-content";

function SectionHeading({
  title,
  description,
  id,
  link,
  linkText = "View all",
  heading = "h2",
}: {
  title: string;
  description?: string;
  id?: string;
  link?: string;
  linkText?: string;
  heading?: "h1" | "h2";
}) {
  const Heading = heading;
  return (
    <div className="section-heading">
      <div className="section-heading-copy">
        <div className="section-title-line">
          <span className="section-marker" />
          <Heading id={id}>{title}</Heading>
        </div>
        {description && <p>{description}</p>}
      </div>
      {link && (
        <Button variant="outline" size="sm" asChild className="view-all-button">
          <Link href={link}>
            {linkText}<ArrowRight size={15} />
          </Link>
        </Button>
      )}
    </div>
  );
}

function VideoCard({ video, index }: { video: Video; index: number }) {
  return (
    <motion.article
      id={`video-${index}`}
      className="video-card"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.38, delay: Math.min(index * 0.018, 0.28), ease: [0.21, 0.6, 0.35, 1] }}
    >
      <div className="video-cover">
        <picture>
          <source srcSet={`${video.imageSmall} 240w, ${video.image} 360w`} sizes="(max-width: 600px) 100vw, (max-width: 1100px) 50vw, 25vw" />
          <img src={video.image} alt={`Cinematic preview for ${video.title}`} width="360" height="203" loading={index < 4 ? "eager" : "lazy"} />
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
            <span className="mini-avatar channel-avatar"><Radio size={10} /></span>
            <span>{video.channel}</span>
          </span>
          {video.actors.map((actor) => (
            <span className="creator-chip model-chip" key={actor}>
              <span className="mini-avatar model-avatar"><UserRound size={10} /></span>
              <span>{actor}</span>
            </span>
          ))}
        </div>
        <div className="video-subline">
          <span>{video.age}</span>
          <span className="subline-dot" />
          <span>4K quality</span>
        </div>
      </div>
    </motion.article>
  );
}

function Pagination({
  page,
  setPage,
}: {
  page: number;
  setPage: (page: number) => void;
}) {
  const [inputValue, setInputValue] = useState("");
  const pageNumbers = [1, 2, 3, 5, 15, 20];
  const jump = () => {
    const requestedPage = Number.parseInt(inputValue, 10);
    if (Number.isFinite(requestedPage)) {
      setPage(Math.min(20, Math.max(1, requestedPage)));
      setInputValue("");
    }
  };

  return (
    <nav className="pagination" aria-label="Video pages">
      <Button
        variant="outline"
        size="icon"
        className="pagination-arrow"
        onClick={() => setPage(Math.max(1, page - 1))}
        disabled={page === 1}
        aria-label="Previous page"
      >
        <ChevronLeft size={16} />
      </Button>
      <div className="page-number-list">
        {pageNumbers.map((number, index) => (
          <span className="page-number-group" key={number}>
            {index >= 3 && <span className="page-ellipsis">···</span>}
            <button
              type="button"
              className={`page-number ${page === number ? "page-number-active" : ""}`}
              aria-current={page === number ? "page" : undefined}
              onClick={() => setPage(number)}
            >
              {number}
            </button>
          </span>
        ))}
      </div>
      <Button
        variant="outline"
        size="icon"
        className="pagination-arrow"
        onClick={() => setPage(Math.min(20, page + 1))}
        disabled={page === 20}
        aria-label="Next page"
      >
        <ChevronRight size={16} />
      </Button>
      <span className="pagination-divider" />
      <label className="page-jump-label" htmlFor="page-jump">Go to</label>
      <Input
        id="page-jump"
        type="number"
        min={1}
        max={20}
        inputMode="numeric"
        placeholder="#"
        className="page-jump-input"
        value={inputValue}
        onChange={(event) => setInputValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") jump();
        }}
        aria-label="Enter page number"
      />
      <Button variant="secondary" size="sm" onClick={jump} className="page-jump-button">Go</Button>
    </nav>
  );
}

function PerformerSection() {
  return (
    <section className="discovery-section" aria-labelledby="trending-pornstars">
      <SectionHeading
        id="trending-pornstars"
        title={siteContent.performersHeading}
        description={siteContent.performersDescription}
        link="/pornstars/"
      />
      <div className="performer-grid">
        {performers.map((performer, index) => (
          <motion.article
            className="performer-card"
            key={performer.name}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.32, delay: index * 0.035 }}
          >
            <div className={`performer-portrait ${performer.tone}`}>
              <img src={`/media/thumb-0${(index % 3) + 1}-240x135.jpg`} alt="" loading="lazy" />
              <span className="portrait-ring" />
              <span className="performer-star"><Star size={11} fill="currentColor" /></span>
            </div>
            <div className="performer-name">{performer.name}</div>
            <div className="performer-count">{performer.videos}</div>
          </motion.article>
        ))}
      </div>
    </section>
  );
}

function ChannelSection() {
  return (
    <section className="discovery-section channel-section" aria-labelledby="trending-channels">
      <SectionHeading
        id="trending-channels"
        title={siteContent.channelsHeading}
        description={siteContent.channelsDescription}
        link="/channels/"
      />
      <div className="channel-grid">
        {channels.map((channel, index) => (
          <motion.article
            className="channel-card"
            key={channel.name}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.32, delay: index * 0.035 }}
          >
            <div className={`channel-logo ${channel.tone}`}>
              <span>{channel.mark}</span>
              <span className="channel-logo-orbit" />
            </div>
            <div className="channel-copy">
              <strong>{channel.name}</strong>
              <span>{channel.videos}</span>
            </div>
            <span className="channel-arrow"><ArrowRight size={15} /></span>
          </motion.article>
        ))}
      </div>
    </section>
  );
}

export function HomepageContent() {
  const [page, setPage] = useState(1);

  return (
    <main className="page-shell">
      <section className="video-section" aria-labelledby="trending-videos">
        <SectionHeading
          id="trending-videos"
          title={siteContent.videosHeading}
          description={siteContent.videosDescription}
          heading="h1"
        />
        <div className="video-grid">
          {videos.map((video, index) => <VideoCard video={video} index={index} key={`${video.title}-${index}`} />)}
        </div>
        <div className="pagination-wrap">
          <div className="pagination-note"><span className="pagination-pulse" /> Page {page} <span className="pagination-note-muted">of 20</span></div>
          <Pagination page={page} setPage={setPage} />
        </div>
      </section>
      <PerformerSection />
      <ChannelSection />
    </main>
  );
}

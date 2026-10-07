import Link from "next/link";
import {
  ArrowRight,
  Play,
  Radio,
  Sparkles,
  Star,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { channels, performers, videos, type Video } from "@/lib/demo-content";
import { Pagination } from "@/components/pagination";
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
    <article id={`video-${index}`} className="video-card">
      <div className="video-cover">
        <picture>
          <source srcSet={`${video.imageSmall} 240w, ${video.image} 360w`} sizes="(max-width: 600px) 100vw, (max-width: 1100px) 50vw, 25vw" />
          <img src={video.image} alt={`Cinematic preview for ${video.title}`} width="360" height="203" loading={index < 2 ? "eager" : "lazy"} fetchPriority={index === 0 ? "high" : undefined} decoding="async" />
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
    </article>
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
          <article className="performer-card" key={performer.name}>
            <div className={`performer-portrait ${performer.tone}`}>
              <img src={`/media/thumb-0${(index % 3) + 1}-240x135.jpg`} alt="" loading="lazy" decoding="async" />
              <span className="portrait-ring" />
              <span className="performer-star"><Star size={11} fill="currentColor" /></span>
            </div>
            <div className="performer-name">{performer.name}</div>
            <div className="performer-count">{performer.videos}</div>
          </article>
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
          <article className="channel-card" key={channel.name}>
            <div className={`channel-logo ${channel.tone}`}>
              <span>{channel.mark}</span>
              <span className="channel-logo-orbit" />
            </div>
            <div className="channel-copy">
              <strong>{channel.name}</strong>
              <span>{channel.videos}</span>
            </div>
            <span className="channel-arrow"><ArrowRight size={15} /></span>
          </article>
        ))}
      </div>
    </section>
  );
}

export function HomepageContent() {
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
        <Pagination />
      </section>
      <PerformerSection />
      <ChannelSection />
    </main>
  );
}

import Link from "next/link";
import {
  ArrowRight,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { channelDirectory, channels, performers } from "@/lib/demo-content";
import { VideoListing } from "@/components/video-listing";
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
        {performers.map((performer) => (
          <Link className="performer-card" href={`/${performer.slug}/`} key={performer.name}>
            <div className={`performer-portrait ${performer.tone}`}>
              <img src={performer.image} alt="" loading="lazy" decoding="async" />
              <span className="portrait-ring" />
              <span className="performer-star"><Star size={11} fill="currentColor" /></span>
            </div>
            <div className="performer-name">{performer.name}</div>
            <div className="performer-count">{performer.videos}</div>
          </Link>
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
        {channels.map((channel) => {
          const detail = channelDirectory.find((item) => item.name === channel.name);
          return (
            <Link className="channel-card" href={detail ? `/${detail.slug}/` : "/channels/"} key={channel.name}>
              <div className={`channel-logo ${channel.tone}`}>
                <span>{channel.mark}</span>
                <span className="channel-logo-orbit" />
              </div>
              <div className="channel-copy">
                <strong>{channel.name}</strong>
                <span>{channel.videos}</span>
              </div>
              <span className="channel-arrow"><ArrowRight size={15} /></span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export function HomepageContent() {
  return (
    <main className="page-shell">
      <VideoListing />
      <PerformerSection />
      <ChannelSection />
      <section className="seo-copy" aria-labelledby="homepage-seo-heading">
        <h2 id="homepage-seo-heading">{siteContent.homeSeoHeading}</h2>
        <p>{siteContent.homeSeoDescription}</p>
      </section>
    </main>
  );
}

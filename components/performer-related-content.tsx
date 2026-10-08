import Link from "next/link";
import { ArrowRight, PlayCircle, UserRound } from "lucide-react";
import type { PerformerProfile, Video } from "@/lib/demo-content";
import { channelDirectory, performers } from "@/lib/demo-content";
import { siteContent } from "@/lib/site-content";

export function PerformerRelatedContent({ performer, videos }: { performer: PerformerProfile; videos: Video[] }) {
  const similarPerformers = performers.filter((item) => item.slug !== performer.slug).slice(0, 8);
  const featuredChannelNames = Array.from(new Set(videos.map((video) => video.channel)));
  const featuredChannels = featuredChannelNames
    .map((name) => channelDirectory.find((channel) => channel.name === name))
    .filter((channel) => channel !== undefined);

  return (
    <div className="channel-related-content">
      <section className="channel-related-section" aria-labelledby="similar-performers-title">
        <div className="channel-related-heading">
          <div>
            <span className="section-marker" />
            <h2 id="similar-performers-title">{siteContent.similarPerformersHeading}</h2>
          </div>
          <p>More performers to explore</p>
        </div>
        <div className="channel-related-scroll" aria-label="Similar performers" tabIndex={0}>
          {similarPerformers.map((item, index) => (
            <Link className="related-performer-card" href={`/${item.slug}/`} key={item.slug}>
              <span className={`related-performer-image portrait-${(index % 3) + 1}`}>
                <img src={item.image} alt="" width="240" height="135" loading="lazy" decoding="async" />
                <span className="related-performer-icon"><UserRound size={17} aria-hidden="true" /></span>
              </span>
              <span className="related-card-copy">
                <strong>{item.name}</strong>
                <span>{item.videos}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {featuredChannels.length > 0 && (
        <section className="channel-related-section" aria-labelledby="featured-channels-title">
          <div className="channel-related-heading">
            <div>
              <span className="section-marker" />
              <h2 id="featured-channels-title">{siteContent.featuredChannelsHeading.replace("this performer", performer.name)}</h2>
            </div>
            <p>Channels in these videos</p>
          </div>
          <div className="channel-related-scroll" aria-label={`Channels featuring ${performer.name}`} tabIndex={0}>
            {featuredChannels.map((channel, index) => (
              <Link className="related-channel-card" href={`/${channel.slug}/`} key={channel.slug}>
                <span className={`related-channel-image related-image-${(index % 3) + 1}`}>
                  <img src={channel.image} alt="" width="240" height="135" loading="lazy" decoding="async" />
                </span>
                <span className="related-card-copy">
                  <strong>{channel.name}</strong>
                  <span><PlayCircle size={13} aria-hidden="true" />{channel.videos}</span>
                </span>
                <ArrowRight className="related-card-arrow" size={15} aria-hidden="true" />
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

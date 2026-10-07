import Link from "next/link";
import { ArrowRight, PlayCircle, UserRound } from "lucide-react";
import type { DirectoryChannel, Video } from "@/lib/demo-content";
import { channelDirectory, performers } from "@/lib/demo-content";
import { siteContent } from "@/lib/site-content";

export function ChannelRelatedContent({ channel, videos }: { channel: DirectoryChannel; videos: Video[] }) {
  const similarChannels = channelDirectory.filter((item) => item.slug !== channel.slug).slice(0, 8);
  const featuredNames = Array.from(new Set(videos.flatMap((video) => video.actors))).slice(0, 8);

  return (
    <div className="channel-related-content">
      <section className="channel-related-section" aria-labelledby="similar-channels-title">
        <div className="channel-related-heading">
          <div>
            <span className="section-marker" />
            <h2 id="similar-channels-title">{siteContent.similarChannelsHeading}</h2>
          </div>
          <p>More channels to explore</p>
        </div>
        <div className="channel-related-scroll" aria-label="Similar channels" tabIndex={0}>
          {similarChannels.map((item, index) => (
            <Link className="related-channel-card" href={`/${item.slug}/`} key={item.slug}>
              <span className={`related-channel-image related-image-${(index % 3) + 1}`}>
                <img src={item.image} alt="" width="240" height="135" loading="lazy" decoding="async" />
              </span>
              <span className="related-card-copy">
                <strong>{item.name}</strong>
                <span><PlayCircle size={13} aria-hidden="true" />{item.videos}</span>
              </span>
              <ArrowRight className="related-card-arrow" size={15} aria-hidden="true" />
            </Link>
          ))}
        </div>
      </section>

      {featuredNames.length > 0 && (
        <section className="channel-related-section" aria-labelledby="featured-performers-title">
          <div className="channel-related-heading">
            <div>
              <span className="section-marker" />
              <h2 id="featured-performers-title">{siteContent.featuredPerformersHeading.replace("this channel", channel.name)}</h2>
            </div>
            <p>Meet the people in these videos</p>
          </div>
          <div className="channel-related-scroll" aria-label={`Performers featured on ${channel.name}`} tabIndex={0}>
            {featuredNames.map((name, index) => {
              const performer = performers.find((item) => item.name === name);
              return (
                <div className="related-performer-card" key={name}>
                  <span className={`related-performer-image portrait-${(index % 3) + 1}`}>
                    <img src={`/media/thumb-0${(index % 3) + 1}-240x135.jpg`} alt="" width="240" height="135" loading="lazy" decoding="async" />
                    <span className="related-performer-icon"><UserRound size={17} aria-hidden="true" /></span>
                  </span>
                  <span className="related-card-copy">
                    <strong>{name}</strong>
                    <span>{performer?.videos ?? "Featured performer"}</span>
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

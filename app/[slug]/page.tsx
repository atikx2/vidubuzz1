import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { ChannelProfile } from "@/components/channel-profile";
import { ChannelRelatedContent } from "@/components/channel-related-content";
import { PerformerProfile } from "@/components/performer-profile";
import { PerformerRelatedContent } from "@/components/performer-related-content";
import { VideoListing } from "@/components/video-listing";
import { channelDirectory, performers, videos } from "@/lib/demo-content";
import { siteContent } from "@/lib/site-content";

type DetailPageProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return [
    ...channelDirectory.map((channel) => ({ slug: channel.slug })),
    ...performers.map((performer) => ({ slug: performer.slug })),
  ];
}

export async function generateMetadata({ params }: DetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const detail = channelDirectory.find((item) => item.slug === slug)
    ?? performers.find((item) => item.slug === slug);
  if (!detail) return {};

  const title = `${detail.name} Adult Videos | Vidubuzz`;
  return {
    title,
    description: detail.seoDescription,
    alternates: { canonical: `/${detail.slug}/` },
    robots: { index: true, follow: true },
    openGraph: {
      title,
      description: detail.seoDescription,
      type: "website",
      siteName: "Vidubuzz",
    },
    twitter: {
      card: "summary",
      title,
      description: detail.seoDescription,
    },
  };
}

export default async function DetailPage({ params }: DetailPageProps) {
  const { slug } = await params;
  const channel = channelDirectory.find((item) => item.slug === slug);

  if (channel) {
    const channelVideos = videos.filter((video) => video.channel === channel.name);
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: `${channel.name} adult videos`,
      description: channel.seoDescription,
      isPartOf: { "@type": "WebSite", name: "Vidubuzz" },
    };

    return (
      <>
        <SiteHeader />
        <main className="page-shell channel-page">
          <ChannelProfile channel={channel} />
          <VideoListing
            items={channelVideos}
            title={siteContent.channelDetailVideosHeading}
            description={`${siteContent.channelDetailVideosDescription} ${channel.name}.`}
            headingId="channel-videos-heading"
            headingLevel="h2"
            totalPages={Math.max(1, Math.ceil(channel.videoCount / 24))}
          />
          <ChannelRelatedContent channel={channel} videos={channelVideos} />
          <section className="seo-copy channel-detail-seo" aria-labelledby="channel-detail-seo-heading">
            <h2 id="channel-detail-seo-heading">{channel.name}: {siteContent.channelDetailSeoHeading}</h2>
            <p>{channel.seoDescription}</p>
          </section>
        </main>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      </>
    );
  }

  const performer = performers.find((item) => item.slug === slug);
  if (!performer) notFound();

  const performerVideos = videos.filter((video) => video.actors.includes(performer.name));
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${performer.name} adult videos`,
    description: performer.seoDescription,
    isPartOf: { "@type": "WebSite", name: "Vidubuzz" },
  };

  return (
    <>
      <SiteHeader />
      <main className="page-shell channel-page performer-page">
        <PerformerProfile performer={performer} />
        <VideoListing
          items={performerVideos}
          title={siteContent.performerDetailVideosHeading}
          description={`${siteContent.performerDetailVideosDescription} ${performer.name}.`}
          headingId="performer-videos-heading"
          headingLevel="h2"
          totalPages={Math.max(1, Math.ceil(performer.videoCount / 24))}
        />
        <PerformerRelatedContent performer={performer} videos={performerVideos} />
        <section className="seo-copy channel-detail-seo" aria-labelledby="performer-detail-seo-heading">
          <h2 id="performer-detail-seo-heading">{performer.name}: {siteContent.performerDetailSeoHeading}</h2>
          <p>{performer.seoDescription}</p>
        </section>
      </main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
    </>
  );
}

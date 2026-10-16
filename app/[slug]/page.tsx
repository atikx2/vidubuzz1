import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { ChannelProfile } from "@/components/channel-profile";
import { ChannelRelatedContent } from "@/components/channel-related-content";
import { PerformerProfile } from "@/components/performer-profile";
import { PerformerRelatedContent } from "@/components/performer-related-content";
import { VideoListing } from "@/components/video-listing";
import { channelDirectory, videos } from "@/lib/demo-content";
import { performers } from "@/lib/public-models";
import { modelSeoTitle, publicSiteUrl, safeJsonLd } from "@/lib/models";
import { siteContent } from "@/lib/site-content";

type DetailPageProps = { params: Promise<{ slug: string }> };
const siteUrl = publicSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
export const dynamicParams = false;
export function generateStaticParams() {
  return [...channelDirectory.map((channel) => ({ slug: channel.slug })), ...performers.map((performer) => ({ slug: performer.slug }))];
}

export async function generateMetadata({ params }: DetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const model = performers.find((item) => item.slug === slug);
  const detail = model ?? channelDirectory.find((item) => item.slug === slug);
  if (!detail) return {};
  const title = model ? modelSeoTitle(model.name, model.seoTitle) : `${detail.name} Adult Videos | Vidubuzz`;
  const url = `${siteUrl}/${detail.slug}/`;
  return { title, description: detail.seoDescription, alternates: { canonical: url },
    robots: { index: model?.source !== "demo", follow: true }, other: { rating: "adult" },
    openGraph: { title, description: detail.seoDescription, url, type: "website", siteName: "Vidubuzz",
      images: [{ url: new URL(detail.image, siteUrl).href, alt: model?.imageAlt || `${detail.name} portrait` }] },
    twitter: { card: "summary_large_image", title, description: detail.seoDescription, images: [new URL(detail.image, siteUrl).href] } };
}

export default async function DetailPage({ params }: DetailPageProps) {
  const { slug } = await params;
  const channel = channelDirectory.find((item) => item.slug === slug);
  if (channel) {
    const channelVideos = videos.filter((video) => video.channel === channel.name);
    const structuredData = { "@context": "https://schema.org", "@type": "CollectionPage", name: `${channel.name} adult videos`,
      description: channel.seoDescription, isPartOf: { "@type": "WebSite", name: "Vidubuzz" } };
    return <><SiteHeader /><main className="page-shell channel-page"><ChannelProfile channel={channel} />
      <VideoListing items={channelVideos} title={siteContent.channelDetailVideosHeading} description={`${siteContent.channelDetailVideosDescription} ${channel.name}.`} headingId="channel-videos-heading" headingLevel="h2" totalPages={Math.max(1, Math.ceil(channel.videoCount / 24))} />
      <ChannelRelatedContent channel={channel} videos={channelVideos} />
      <section className="seo-copy channel-detail-seo" aria-labelledby="channel-detail-seo-heading"><h2 id="channel-detail-seo-heading">{channel.name}: {siteContent.channelDetailSeoHeading}</h2><p>{channel.seoDescription}</p></section>
    </main><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(structuredData) }} /></>;
  }
  const performer = performers.find((item) => item.slug === slug);
  if (!performer) notFound();
  const performerVideos = performer.source === "demo" ? videos.filter((video) => video.actors.includes(performer.name)) : [];
  const url = `${siteUrl}/${performer.slug}/`;
  const structuredData = { "@context": "https://schema.org", "@graph": [
    { "@type": "ProfilePage", "@id": `${url}#profile`, url, name: modelSeoTitle(performer.name, performer.seoTitle),
      description: performer.seoDescription, isFamilyFriendly: false,
      mainEntity: { "@type": "Person", "@id": `${url}#person`, name: performer.name, url,
        description: performer.seoDescription, image: new URL(performer.image, siteUrl).href },
      isPartOf: { "@type": "WebSite", name: "Vidubuzz", url: siteUrl } },
    { "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${siteUrl}/` },
      { "@type": "ListItem", position: 2, name: "Models", item: `${siteUrl}/pornstars/` },
      { "@type": "ListItem", position: 3, name: performer.name, item: url },
    ] },
  ] };
  return <><SiteHeader /><main className="page-shell channel-page performer-page"><PerformerProfile performer={performer} />
    <VideoListing items={performerVideos} title={siteContent.performerDetailVideosHeading} description={`${siteContent.performerDetailVideosDescription} ${performer.name}.`} headingId="performer-videos-heading" headingLevel="h2" totalPages={Math.max(1, Math.ceil(performerVideos.length / 24))} />
    <PerformerRelatedContent performer={performer} videos={performerVideos} />
    <section className="seo-copy channel-detail-seo" aria-labelledby="performer-detail-seo-heading"><h2 id="performer-detail-seo-heading">{performer.name}: {siteContent.performerDetailSeoHeading}</h2><p>{performer.seoDescription}</p></section>
  </main><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(structuredData) }} /></>;
}

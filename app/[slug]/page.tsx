import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { ChannelProfile } from "@/components/channel-profile";
import { ChannelRelatedContent } from "@/components/channel-related-content";
import { InformationPageView } from "@/components/information-page";
import { PerformerProfile } from "@/components/performer-profile";
import { PerformerRelatedContent } from "@/components/performer-related-content";
import { VideoListing } from "@/components/video-listing";
import { videos } from "@/lib/demo-content";
import { channelDirectory, informationPages, publicRobots, siteOrigin, siteSettings } from "@/lib/public-platform";
import { performers } from "@/lib/public-models";
import { modelSeoTitle, safeJsonLd } from "@/lib/models";
import { catalogTitle } from "@/lib/platform";
import { siteContent } from "@/lib/site-content";

type DetailPageProps = { params: Promise<{ slug: string }> };
export const dynamicParams = false;
export function generateStaticParams() {
  return [...channelDirectory, ...performers, ...informationPages].map(({ slug }) => ({ slug }));
}
export async function generateMetadata({ params }: DetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = informationPages.find((item) => item.slug === slug);
  if (page) { const title = `${page.title} | ${siteSettings.brandName}`, url = `${siteOrigin}/${page.slug}/`;
    return { title, description: page.description, alternates: { canonical: url }, robots: { ...publicRobots("pages"), index: publicRobots("pages").index && !page.noindex },
      openGraph: { title, description: page.description, url, type: "website", siteName: siteSettings.brandName }, twitter: { card: "summary", title, description: page.description } }; }
  const model = performers.find((item) => item.slug === slug), channel = channelDirectory.find((item) => item.slug === slug), detail = model ?? channel;
  if (!detail) return {};
  const title = model ? modelSeoTitle(model.name, model.seoTitle, siteSettings.brandName) : catalogTitle(detail.name, detail.seoTitle, siteSettings.brandName), url = `${siteOrigin}/${detail.slug}/`;
  return { title, description: detail.seoDescription, alternates: { canonical: url }, robots: publicRobots(model ? "models" : "channels", detail.source === "demo"), other: { rating: "adult" },
    openGraph: { title, description: detail.seoDescription, url, type: "website", siteName: siteSettings.brandName, images: [{ url: new URL(detail.image, siteOrigin).href, alt: detail.imageAlt || `${detail.name} portrait` }] },
    twitter: { card: "summary_large_image", title, description: detail.seoDescription, images: [new URL(detail.image, siteOrigin).href] } };
}
export default async function DetailPage({ params }: DetailPageProps) {
  const { slug } = await params;
  const page = informationPages.find((item) => item.slug === slug);
  if (page) return <InformationPageView page={page} />;
  const channel = channelDirectory.find((item) => item.slug === slug);
  if (channel) {
    // No fabricated video associations for managed channels. The video editor is a later task.
    const channelVideos = channel.source === "demo" ? videos.filter((video) => video.channel === channel.name) : [];
    const structuredData = { "@context": "https://schema.org", "@type": "CollectionPage", name: channel.name, url: `${siteOrigin}/${channel.slug}/`,
      description: channel.seoDescription, isFamilyFriendly: false, isPartOf: { "@type": "WebSite", name: siteSettings.brandName, url: siteOrigin } };
    return <><SiteHeader /><main className="page-shell channel-page"><ChannelProfile channel={channel} />
      <VideoListing items={channelVideos} title={siteContent.channelDetailVideosHeading} description={`${siteContent.channelDetailVideosDescription} ${channel.name}.`} headingId="channel-videos-heading" headingLevel="h2" />
      <ChannelRelatedContent channel={channel} videos={channelVideos} /><section className="seo-copy channel-detail-seo" aria-labelledby="channel-detail-seo-heading"><h2 id="channel-detail-seo-heading">{channel.name}: {siteContent.channelDetailSeoHeading}</h2><p>{channel.seoDescription}</p></section>
    </main><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(structuredData) }} /></>;
  }
  const performer = performers.find((item) => item.slug === slug);
  if (!performer) notFound();
  const performerVideos = performer.source === "demo" ? videos.filter((video) => video.actors.includes(performer.name)) : [], url = `${siteOrigin}/${performer.slug}/`;
  const structuredData = { "@context": "https://schema.org", "@graph": [
    { "@type": "ProfilePage", "@id": `${url}#profile`, url, name: modelSeoTitle(performer.name, performer.seoTitle, siteSettings.brandName), description: performer.seoDescription, isFamilyFriendly: false,
      mainEntity: { "@type": "Person", "@id": `${url}#person`, name: performer.name, url, description: performer.seoDescription, image: new URL(performer.image, siteOrigin).href }, isPartOf: { "@type": "WebSite", name: siteSettings.brandName, url: siteOrigin } },
    { "@type": "BreadcrumbList", itemListElement: [ { "@type": "ListItem", position: 1, name: "Home", item: `${siteOrigin}/` }, { "@type": "ListItem", position: 2, name: "Models", item: `${siteOrigin}/pornstars/` }, { "@type": "ListItem", position: 3, name: performer.name, item: url } ] },
  ] };
  return <><SiteHeader /><main className="page-shell channel-page performer-page"><PerformerProfile performer={performer} />
    <VideoListing items={performerVideos} title={siteContent.performerDetailVideosHeading} description={`${siteContent.performerDetailVideosDescription} ${performer.name}.`} headingId="performer-videos-heading" headingLevel="h2" />
    <PerformerRelatedContent performer={performer} videos={performerVideos} /><section className="seo-copy performer-detail-seo" aria-labelledby="performer-detail-seo-heading"><h2 id="performer-detail-seo-heading">{performer.name}: {siteContent.performerDetailSeoHeading}</h2><p>{performer.seoDescription}</p></section>
  </main><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(structuredData) }} /></>;
}

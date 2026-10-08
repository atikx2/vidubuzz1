import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RelatedVideos } from "@/components/related-videos";
import { SiteHeader } from "@/components/site-header";
import { VideoPageInfo } from "@/components/video-page-info";
import { VideoPlayer } from "@/components/video-player";
import { videos } from "@/lib/demo-content";
import { videoSourcesById } from "@/lib/video-sources";

type VideoPageProps = { params: Promise<{ id: string }> };

export function generateStaticParams() {
  return videos.map((video) => ({ id: String(video.id) }));
}

function getVideo(id: string) {
  const numericId = Number(id);
  if (!Number.isInteger(numericId)) return undefined;
  return videos.find((video) => video.id === numericId);
}

export async function generateMetadata({ params }: VideoPageProps): Promise<Metadata> {
  const { id } = await params;
  const video = getVideo(id);
  if (!video) return {};

  return {
    title: `${video.title} | Vidubuzz`,
    description: video.description,
    alternates: { canonical: `/video/${video.id}/` },
    robots: { index: true, follow: true },
    openGraph: {
      title: `${video.title} | Vidubuzz`,
      description: video.description,
      type: "video.other",
      siteName: "Vidubuzz",
    },
    twitter: { card: "summary", title: video.title, description: video.description },
  };
}

export default async function VideoPage({ params }: VideoPageProps) {
  const { id } = await params;
  const video = getVideo(id);
  if (!video) notFound();

  const relatedVideos = videos
    .filter((item) => item.id !== video.id)
    .sort((a, b) => {
      const aMatch = a.channel === video.channel || a.categories.some((category) => video.categories.includes(category));
      const bMatch = b.channel === video.channel || b.categories.some((category) => video.categories.includes(category));
      if (aMatch !== bMatch) return aMatch ? -1 : 1;
      return b.viewCount - a.viewCount;
    })
    .slice(0, 8);

  const sources = videoSourcesById[video.id] ?? [];
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: video.title,
    description: video.description,
    thumbnailUrl: video.image,
    embedUrl: `/video/${video.id}/`,
    duration: `PT${video.duration.replace(":", "M")}S`,
    interactionStatistic: {
      "@type": "InteractionCounter",
      interactionType: { "@type": "WatchAction" },
      userInteractionCount: video.viewCount,
    },
  };

  return (
    <>
      <SiteHeader />
      <main className="page-shell video-page">
        <VideoPlayer poster={video.image} sources={sources} title={video.title} />
        <VideoPageInfo video={video} />
        <RelatedVideos videos={relatedVideos} />
      </main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
    </>
  );
}

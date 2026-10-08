import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Hash, PlayCircle } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { VideoListing } from "@/components/video-listing";
import { categoryDirectory, videos } from "@/lib/demo-content";
import { siteContent } from "@/lib/site-content";

type CategoryPageProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return categoryDirectory.map((category) => ({ slug: category.slug }));
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = categoryDirectory.find((item) => item.slug === slug);
  if (!category) return {};

  const title = `${category.name} Adult Videos | Vidubuzz`;
  return {
    title,
    description: category.seoDescription,
    alternates: { canonical: `/categories/${category.slug}/` },
    robots: { index: true, follow: true },
    openGraph: {
      title,
      description: category.seoDescription,
      type: "website",
      siteName: "Vidubuzz",
    },
    twitter: {
      card: "summary",
      title,
      description: category.seoDescription,
    },
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  const category = categoryDirectory.find((item) => item.slug === slug);
  if (!category) notFound();

  const categoryVideos = videos.filter((video) => video.categories.includes(category.slug));
  const relatedCategories = categoryDirectory.filter((item) => item.slug !== category.slug).slice(0, 6);
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${category.name} adult videos`,
    description: category.seoDescription,
    isPartOf: { "@type": "WebSite", name: "Vidubuzz" },
  };

  return (
    <>
      <SiteHeader />
      <main className="page-shell category-page">
        <section className="category-profile" aria-labelledby="category-profile-title">
          <div className="category-profile-top">
            <span className="category-profile-icon"><Hash size={24} aria-hidden="true" /></span>
            <div>
              <p className="channel-profile-eyebrow">Video category</p>
              <h1 id="category-profile-title">{category.name}</h1>
              <span className="category-profile-count"><PlayCircle size={15} aria-hidden="true" />{category.videos}</span>
            </div>
          </div>
          <p className="category-profile-description">{category.description}</p>
        </section>

        <VideoListing
          items={categoryVideos}
          title={siteContent.categoryDetailVideosHeading}
          description={`${siteContent.categoryDetailVideosDescription} ${category.name}.`}
          headingId="category-videos-heading"
          headingLevel="h2"
          totalPages={Math.max(1, Math.ceil(category.videoCount / 24))}
        />

        <section className="channel-related-section category-related-section" aria-labelledby="related-categories-heading">
          <div className="channel-related-heading">
            <div>
              <span className="section-marker" />
              <h2 id="related-categories-heading">{siteContent.relatedCategoriesHeading}</h2>
            </div>
            <p>Browse more topics</p>
          </div>
          <div className="channel-related-scroll" aria-label="Related categories" tabIndex={0}>
            {relatedCategories.map((item, index) => (
              <Link className="related-channel-card" href={`/categories/${item.slug}/`} key={item.slug}>
                <span className={`related-channel-image related-image-${(index % 3) + 1}`}>
                  <img src={item.image} alt="" width="240" height="135" loading="lazy" decoding="async" />
                </span>
                <span className="related-card-copy">
                  <strong>{item.name}</strong>
                  <span><PlayCircle size={13} aria-hidden="true" />{item.videos}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section className="seo-copy category-detail-seo" aria-labelledby="category-detail-seo-heading">
          <h2 id="category-detail-seo-heading">{category.name} Adult Videos on Vidubuzz</h2>
          <p>{category.seoDescription}</p>
        </section>
      </main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
    </>
  );
}

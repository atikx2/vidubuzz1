"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, ListFilter } from "lucide-react";
import { Pagination } from "@/components/pagination";
import { categoryDirectory } from "@/lib/demo-content";
import { siteContent } from "@/lib/site-content";

type CategorySort = "popular" | "latest";

export function CategoryDirectory() {
  const [sortMode, setSortMode] = useState<CategorySort>("popular");
  const sortedCategories = useMemo(() => {
    const items = [...categoryDirectory];
    if (sortMode === "latest") return items.sort((a, b) => b.id - a.id);
    return items.sort((a, b) => b.videoCount - a.videoCount);
  }, [sortMode]);

  return (
    <section className="category-directory" aria-labelledby="category-page-title">
      <div className="section-heading category-directory-heading">
        <div className="section-heading-copy">
          <div className="section-title-line">
            <span className="section-marker" />
            <h1 id="category-page-title">{siteContent.categoriesPageTitle}</h1>
          </div>
          <p>{siteContent.categoriesPageSubtitle}</p>
        </div>
        <label className="video-filter category-filter" htmlFor="category-sort">
          <ListFilter size={15} className="video-filter-icon" aria-hidden="true" />
          <span className="filter-caption">Filter</span>
          <select
            id="category-sort"
            value={sortMode}
            onChange={(event) => setSortMode(event.target.value as CategorySort)}
            aria-label="Sort categories"
          >
            <option value="popular">Most Videos</option>
            <option value="latest">Latest Categories</option>
          </select>
          <ChevronDown size={14} className="video-filter-chevron" aria-hidden="true" />
        </label>
      </div>

      <div className="directory-channel-grid directory-category-grid">
        {sortedCategories.map((category, index) => (
          <Link className="directory-channel-card" href={`/categories/${category.slug}/`} key={category.id}>
            <div className={`directory-channel-avatar directory-avatar-${(index % 3) + 1}`}>
              <img src={category.image} alt="" width="240" height="135" loading="lazy" decoding="async" />
              <span className="directory-avatar-ring" />
            </div>
            <div className="directory-channel-copy">
              <h2>{category.name}</h2>
              <p>{category.videos}</p>
            </div>
          </Link>
        ))}
      </div>

      <Pagination totalPages={21} />

      <section className="seo-copy category-seo-copy" aria-labelledby="category-seo-heading">
        <h2 id="category-seo-heading">{siteContent.categoriesPageSeoHeading}</h2>
        <p>{siteContent.categoriesPageSeoDescription}</p>
      </section>
    </section>
  );
}

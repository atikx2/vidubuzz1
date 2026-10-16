"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, ListFilter, Search } from "lucide-react";
import { Pagination } from "@/components/pagination";
import { channelDirectory, categoryDirectory } from "@/lib/public-catalog-cards";
import { siteContent } from "@/lib/site-content";
import type { CatalogKind } from "@/lib/platform";

export function CatalogDirectory({ kind }: { kind: CatalogKind }) {
  const [sort, setSort] = useState("popular"), [page, setPage] = useState(1), [search, setSearch] = useState("");
  const isChannel = kind === "channel", noun = isChannel ? "channels" : "categories", all = isChannel ? channelDirectory : categoryDirectory;
  const sorted = useMemo(() => all.map((item, index) => ({ item, index })).filter(({ item }) => item.name.toLowerCase().includes(search.trim().toLowerCase())).sort((a, b) => sort === "latest"
    ? (Date.parse(b.item.createdAt || "") || 0) - (Date.parse(a.item.createdAt || "") || 0) || b.index - a.index
    : b.item.videoCount - a.item.videoCount || a.index - b.index).map(({ item }) => item), [all, search, sort]);
  const totalPages = Math.max(1, Math.ceil(sorted.length / 24)), currentPage = Math.min(page, totalPages), visible = sorted.slice((currentPage - 1) * 24, currentPage * 24);
  return <section className={`${isChannel ? "channel" : "category"}-directory`} aria-labelledby={`${kind}-page-title`}>
    <div className={`section-heading ${kind}-directory-heading`}><div className="section-heading-copy"><div className="section-title-line"><span className="section-marker" /><h1 id={`${kind}-page-title`}>{isChannel ? siteContent.channelPageTitle : siteContent.categoriesPageTitle}</h1></div><p>{isChannel ? siteContent.channelPageSubtitle : siteContent.categoriesPageSubtitle}</p></div><label className="video-filter" htmlFor={`${kind}-sort`}><ListFilter size={15} className="video-filter-icon" /><span className="filter-caption">Sort</span><select id={`${kind}-sort`} aria-label={`Sort ${noun}`} value={sort} onChange={(event) => { setSort(event.target.value); setPage(1); }}><option value="popular">Most videos</option><option value="latest">Latest</option></select><ChevronDown size={14} className="video-filter-chevron" /></label></div>
    <div className="public-directory-toolbar"><label><Search size={16} /><input aria-label={`Search public ${noun}`} placeholder={`Search ${noun}…`} maxLength={100} value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} /></label><span>{sorted.length} {noun}</span></div>
    {visible.length ? <div className={`directory-channel-grid ${!isChannel ? "directory-category-grid" : ""}`}>{visible.map((item, index) => <Link className="directory-channel-card" href={`${isChannel ? "/" : "/categories/"}${item.slug}/`} key={item.id}><div className={`directory-channel-avatar directory-avatar-${index % 3 + 1}`}><img src={item.image} alt={item.imageAlt || ""} width="240" height="135" loading="lazy" decoding="async" /><span className="directory-avatar-ring" /></div><div className="directory-channel-copy"><h2>{item.name}</h2><p>{item.videos}</p>{item.source === "demo" && <small className="public-demo-label">Fictional demo</small>}</div></Link>)}</div> : <p className="public-directory-empty">{search ? "No matches. Try another name." : `No public ${noun} yet.`}</p>}
    {totalPages > 1 && <Pagination totalPages={totalPages} page={currentPage} onPageChange={setPage} />}
    <section className="seo-copy" aria-labelledby={`${kind}-seo-heading`}><h2 id={`${kind}-seo-heading`}>{isChannel ? siteContent.channelPageSeoHeading : siteContent.categoriesPageSeoHeading}</h2><p>{isChannel ? siteContent.channelPageSeoDescription : siteContent.categoriesPageSeoDescription}</p></section>
  </section>;
}

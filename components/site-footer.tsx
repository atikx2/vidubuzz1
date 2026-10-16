"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, ShieldCheck } from "lucide-react";
export function SiteFooter({ brandName, tagline, notice, links, year }: { brandName: string; tagline: string; notice: string; links: Array<{ slug: string; title: string }>; year: number }) {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) return null;
  return <footer className="public-site-footer"><div className="page-shell"><div className="public-footer-top"><div><Link className="public-footer-brand" href="/">{brandName}</Link>{tagline && <p>{tagline}</p>}<span><ShieldCheck size={14} />Adults only · 18+</span></div><nav aria-label="Footer navigation"><Link href="/pornstars/">Models</Link><Link href="/channels/">Channels</Link><Link href="/categories/">Categories</Link>{links.map((page) => <Link key={page.slug} href={`/${page.slug}/`}>{page.title}</Link>)}</nav></div><div className="public-footer-bottom"><span>© {year} {brandName}</span>{notice && <p>{notice}</p>}<Link href="/admin/login/" aria-label="Administrator sign in">Admin<ArrowUpRight size={12} /></Link></div></div></footer>;
}

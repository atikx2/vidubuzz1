import Link from "next/link";
import { ArrowLeft, Compass } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
export default function NotFound() {
  return <><SiteHeader /><main className="page-shell public-not-found"><span><Compass size={36} /></span><p>404 · PAGE NOT FOUND</p><h1>A little off the beaten path.</h1><div>This page may have moved, been archived, or not been published yet.</div><Link href="/"><ArrowLeft size={16} />Back to the homepage</Link><nav aria-label="Explore the website"><Link href="/pornstars/">Models</Link><Link href="/channels/">Channels</Link><Link href="/categories/">Categories</Link></nav></main></>;
}

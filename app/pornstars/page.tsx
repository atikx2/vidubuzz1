import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { PerformerDirectory } from "@/components/performer-directory";
import { siteContent } from "@/lib/site-content";

export const metadata: Metadata = {
  title: `${siteContent.performersPageTitle} | Vidubuzz`,
  description: siteContent.performersPageSubtitle,
  alternates: { canonical: "/pornstars/" },
  robots: { index: true, follow: true },
};

export default function PornstarsPage() {
  return (
    <>
      <SiteHeader />
      <main className="page-shell">
        <PerformerDirectory />
      </main>
    </>
  );
}

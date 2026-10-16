import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { PerformerDirectory } from "@/components/performer-directory";
import { publicRobots, siteSettings } from "@/lib/public-platform";
import { siteContent } from "@/lib/site-content";

export const metadata: Metadata = {
  title: `${siteContent.performersPageTitle} | ${siteSettings.brandName}`,
  description: siteContent.performersPageSubtitle,
  alternates: { canonical: "/pornstars/" },
  robots: publicRobots("models"),
  openGraph: { title: `${siteContent.performersPageTitle} | ${siteSettings.brandName}`, description: siteContent.performersPageSubtitle,
    url: "/pornstars/", type: "website", siteName: siteSettings.brandName },
  twitter: { card: "summary", title: `${siteContent.performersPageTitle} | ${siteSettings.brandName}`, description: siteContent.performersPageSubtitle },
  other: { rating: "adult" },
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

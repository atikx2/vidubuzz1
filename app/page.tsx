import type { Metadata } from "next";
import { siteSettings, publicRobots } from "@/lib/public-platform";
import { SiteHeader } from "@/components/site-header";
import { HomepageContent } from "@/components/homepage-content";

export const metadata: Metadata = { title: siteSettings.homeTitle, description: siteSettings.homeDescription, alternates: { canonical: "/" }, robots: publicRobots(), openGraph: { title: siteSettings.homeTitle, description: siteSettings.homeDescription, url: "/", siteName: siteSettings.brandName } };

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <HomepageContent />
    </>
  );
}

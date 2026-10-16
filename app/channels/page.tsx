import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { ChannelDirectory } from "@/components/channel-directory";
import { publicRobots, siteSettings } from "@/lib/public-platform";
import { siteContent } from "@/lib/site-content";

export const metadata: Metadata = {
  title: `${siteContent.channelPageTitle} | ${siteSettings.brandName}`,
  description: siteContent.channelPageSubtitle,
  alternates: { canonical: "/channels/" }, robots: publicRobots("channels"),
};

export default function ChannelsPage() {
  return (
    <>
      <SiteHeader />
      <main className="page-shell">
        <ChannelDirectory />
      </main>
    </>
  );
}

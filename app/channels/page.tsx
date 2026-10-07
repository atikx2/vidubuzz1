import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { ChannelDirectory } from "@/components/channel-directory";
import { siteContent } from "@/lib/site-content";

export const metadata: Metadata = {
  title: `${siteContent.channelPageTitle} | Vidubuzz`,
  description: siteContent.channelPageSubtitle,
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

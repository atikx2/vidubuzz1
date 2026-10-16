import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AnalyticsTracker } from "@/components/analytics-tracker";
import { publicSiteUrl } from "@/lib/models";

export const metadata: Metadata = {
  metadataBase: new URL(publicSiteUrl(process.env.NEXT_PUBLIC_SITE_URL)),
  title: "Trending Videos | Vidubuzz",
  description: "Discover trending videos, popular models, and top channels on Vidubuzz. New picks, updated daily.",
  applicationName: "Vidubuzz",
  openGraph: {
    title: "Trending Videos | Vidubuzz",
    description: "Discover trending videos, popular models, and top channels.",
    type: "website",
    siteName: "Vidubuzz",
  },
};

export const viewport: Viewport = {
  themeColor: "#0d0d11",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AnalyticsTracker />
        {children}
      </body>
    </html>
  );
}

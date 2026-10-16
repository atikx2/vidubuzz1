import type { Metadata, Viewport } from "next";
import type { CSSProperties } from "react";
import "./globals.css";
import "./site-settings.css";
import { AnalyticsTracker } from "@/components/analytics-tracker";
import { SiteFooter } from "@/components/site-footer";
import { informationPages, publicRobots, siteOrigin, siteSettings } from "@/lib/public-platform";
import { siteThemeStyle } from "@/lib/platform";

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin), title: siteSettings.homeTitle, description: siteSettings.homeDescription,
  applicationName: siteSettings.brandName, robots: publicRobots(), other: { rating: "adult" },
  verification: { ...(siteSettings.googleVerification ? { google: siteSettings.googleVerification } : {}), ...(siteSettings.bingVerification ? { other: { "msvalidate.01": siteSettings.bingVerification } } : {}) },
  openGraph: { title: siteSettings.homeTitle, description: siteSettings.homeDescription, type: "website", siteName: siteSettings.brandName },
  twitter: { card: "summary", title: siteSettings.homeTitle, description: siteSettings.homeDescription },
};
export const viewport: Viewport = { themeColor: siteSettings.theme.background, width: "device-width", initialScale: 1 };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" style={siteThemeStyle(siteSettings.theme) as CSSProperties}><body><AnalyticsTracker />{children}<SiteFooter brandName={siteSettings.brandName} tagline={siteSettings.tagline} notice={siteSettings.footerText} links={informationPages.map(({ slug, title }) => ({ slug, title }))} year={new Date().getUTCFullYear()} /></body></html>;
}

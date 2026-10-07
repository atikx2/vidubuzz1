import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
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
      <body>{children}</body>
    </html>
  );
}

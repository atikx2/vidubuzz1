"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { recordAnalyticsEvent } from "@/lib/analytics-client";

export function AnalyticsTracker() {
  const pathname = usePathname();
  const previousPath = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname) return;
    if (pathname.startsWith("/admin")) { previousPath.current = pathname; return; }
    if (previousPath.current !== pathname) {
      previousPath.current = pathname;
      recordAnalyticsEvent("page_view", pathname);
    }
    const heartbeat = () => { if (!document.hidden) recordAnalyticsEvent("heartbeat", pathname); };
    const timer = window.setInterval(heartbeat, 60_000);
    document.addEventListener("visibilitychange", heartbeat);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", heartbeat); };
  }, [pathname]);

  return null;
}

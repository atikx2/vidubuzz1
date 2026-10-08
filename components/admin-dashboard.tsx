"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity, ArrowUpRight, CalendarDays, Clapperboard, Eye, FileChartColumnIncreasing,
  Play, Radio, RefreshCw, ShieldCheck, Tags, TrendingUp, UsersRound,
} from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { useAdminSession } from "@/components/use-admin-session";
import { AdminApiError, adminRequest } from "@/lib/admin-api";

type Metrics = {
  activeVisitors: number;
  totalViews: number;
  totalPageViews: number;
  viewsToday: number;
  totalVideos: number;
  totalModels: number;
  totalChannels: number;
  totalCategories: number;
  last7Days: Array<{ date: string; views: number }>;
  topVideos: Array<{ id: number; title: string; channel: string; views: number }>;
  catalogSource: "demo";
  updatedAt: string;
};

const formatNumber = (value: number) => new Intl.NumberFormat("en-US").format(value);
const shortDay = (date: string) => new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });

function ViewsChart({ data }: { data: Metrics["last7Days"] }) {
  const width = 700;
  const height = 180;
  const step = Math.max(1, Math.ceil(Math.max(3, ...data.map((item) => item.views)) / 3));
  const max = step * 3;
  const point = (views: number, index: number) => ({ x: (index + 0.5) / data.length * width, y: height - views / max * height });
  const points = data.map((item, index) => { const { x, y } = point(item.views, index); return `${x},${y}`; }).join(" ");

  return (
    <div className="admin-chart-wrap">
      <div className="admin-chart-axis" aria-hidden="true">{[3, 2, 1, 0].map((tick) => <span key={tick}>{formatNumber(tick * step)}</span>)}</div>
      <div className="admin-chart-plot">
        <div className="admin-chart-gridlines" aria-hidden="true">{[0, 1, 2, 3].map((line) => <i key={line} />)}</div>
        <svg className="admin-chart" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label="Daily tracked video plays, last seven days">
          <defs><linearGradient id="admin-chart-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f5668b" stopOpacity="0.22" /><stop offset="100%" stopColor="#f5668b" stopOpacity="0.01" /></linearGradient></defs>
          <polygon points={`0,${height} ${points} ${width},${height}`} className="admin-chart-area" />
          <polyline points={points} className="admin-chart-line" vectorEffect="non-scaling-stroke" />
          {data.map((item, index) => { const { x, y } = point(item.views, index); return <circle key={item.date} cx={x} cy={y} r="3.5" className="admin-chart-point"><title>{item.date}: {formatNumber(item.views)} plays</title></circle>; })}
        </svg>
        <div className="admin-chart-days" aria-hidden="true">{data.map((item) => <span key={item.date}>{shortDay(item.date)}</span>)}</div>
      </div>
      <ul className="admin-visually-hidden">{data.map((item) => <li key={item.date}>{item.date}: {item.views} video plays</li>)}</ul>
    </div>
  );
}

export function AdminDashboard() {
  const router = useRouter();
  const { session, loading: sessionLoading, error: sessionError } = useAdminSession();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [error, setError] = useState("");
  const refreshRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    if (!session) return;
    const controller = new AbortController();
    let inFlight = false;
    async function load() {
      if (inFlight || controller.signal.aborted) return;
      inFlight = true;
      setLoadingMetrics(true);
      try {
        const result = await adminRequest<Metrics>("/api/admin/metrics", { signal: controller.signal });
        if (!controller.signal.aborted) { setMetrics(result); setError(""); }
      } catch (cause) {
        if (controller.signal.aborted) return;
        if (cause instanceof AdminApiError && cause.status === 401) router.replace("/admin/login/");
        else setError(cause instanceof Error ? cause.message : "Could not load metrics.");
      } finally {
        inFlight = false;
        if (!controller.signal.aborted) setLoadingMetrics(false);
      }
    }
    refreshRef.current = () => void load();
    void load();
    const refreshWhenVisible = () => { if (!document.hidden) void load(); };
    const timer = window.setInterval(refreshWhenVisible, 30_000);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => { controller.abort(); window.clearInterval(timer); document.removeEventListener("visibilitychange", refreshWhenVisible); refreshRef.current = () => undefined; };
  }, [session, router]);

  const cards = [
    { title: "Realtime visitors", value: metrics?.activeVisitors, note: "Active in the last 5 minutes", icon: Activity, tone: "pink", badge: "LIVE" },
    { title: "Total views", value: metrics?.totalViews, note: "Tracked video plays · all time", icon: Eye, tone: "violet", badge: "ALL TIME" },
    { title: "Total videos", value: metrics?.totalVideos, note: "Current catalog entries", icon: Clapperboard, tone: "blue", badge: "CATALOG" },
    { title: "Total models", value: metrics?.totalModels, note: "Performer profiles", icon: UsersRound, tone: "amber", badge: "CATALOG" },
    { title: "Total channels", value: metrics?.totalChannels, note: "Channel profiles", icon: Radio, tone: "rose", badge: "CATALOG" },
    { title: "Total categories", value: metrics?.totalCategories, note: "Browsing categories", icon: Tags, tone: "teal", badge: "CATALOG" },
    { title: "Page views", value: metrics?.totalPageViews, note: "Public page visits · all time", icon: FileChartColumnIncreasing, tone: "blue", badge: "ALL TIME" },
    { title: "Views today", value: metrics?.viewsToday, note: "Video plays since midnight UTC", icon: CalendarDays, tone: "violet", badge: "TODAY" },
  ];
  const weekViews = metrics?.last7Days.reduce((total, day) => total + day.views, 0) ?? 0;
  const setupError = sessionError || error;

  return (
    <AdminShell title="Dashboard" subtitle="Your traffic, content and workspace — in one place." email={session?.email}>
      {setupError && <div className="admin-config-alert" role="status"><ShieldCheck size={19} /><div><strong>{metrics ? "Live update paused" : "Dashboard setup needed"}</strong><p>{setupError}</p></div></div>}
      {session?.mustChangePassword && <div className="admin-password-reminder"><ShieldCheck size={17} /><span>You are using the initial password. Update it to secure your account.</span><Link href="/admin/profile/">Change password<ArrowUpRight size={14} /></Link></div>}
      <div className="admin-overview-heading"><span><i className="admin-live-dot" /> SITE OVERVIEW</span><button className="admin-refresh-button" type="button" disabled={!session || loadingMetrics} onClick={() => refreshRef.current()}><RefreshCw size={14} className={loadingMetrics ? "admin-refresh-spinning" : ""} /><span>{loadingMetrics ? "Refreshing" : "Refresh"}</span></button></div>
      <section className="admin-metric-grid" aria-label="Site metrics" aria-busy={sessionLoading || loadingMetrics}>
        {cards.map(({ icon: Icon, ...card }) => (
          <article className={`admin-metric-card metric-${card.tone}`} key={card.title}>
            <div className="admin-metric-top"><span className="admin-metric-icon"><Icon size={20} strokeWidth={1.8} aria-hidden="true" /></span><span className={`admin-metric-badge ${card.badge === "LIVE" ? "metric-badge-live" : ""}`}>{card.badge === "LIVE" && <i />}{card.badge}</span></div>
            <p>{card.title}</p><strong className={card.value === undefined && (sessionLoading || loadingMetrics) ? "admin-value-loading" : ""}>{card.value === undefined ? "—" : formatNumber(card.value)}</strong><small>{card.note}</small>
          </article>
        ))}
      </section>
      <section className="admin-panel-card admin-analytics-panel" id="analytics" aria-labelledby="admin-analytics-title">
        <div className="admin-panel-heading"><div><p>TRAFFIC OVERVIEW</p><h2 id="admin-analytics-title">Video views</h2><span>Last 7 days · UTC</span></div><div className="admin-panel-live"><i /> Updates every 30s</div></div>
        <div className="admin-chart-summary"><strong>{metrics ? formatNumber(weekViews) : "—"}</strong><span>plays this week</span><span className="admin-chart-period"><TrendingUp size={14} />7-day overview</span></div>
        {metrics ? <ViewsChart data={metrics.last7Days} /> : <div className="admin-chart-empty">{sessionLoading || loadingMetrics ? "Loading analytics…" : "Connect D1 to start collecting visitor and playback analytics."}</div>}
        <div className="admin-chart-footer"><span>{metrics ? `Updated ${new Date(metrics.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "No fabricated traffic data"}</span><span><i className="admin-chart-legend" />Tracked video plays</span></div>
      </section>
      <div className="admin-secondary-grid">
        <section className="admin-panel-card admin-popular-panel" aria-labelledby="admin-popular-title">
          <div className="admin-panel-heading"><div><p>AUDIENCE FAVORITES</p><h2 id="admin-popular-title">Most watched</h2><span>Top videos by tracked plays</span></div><span className="admin-panel-icon"><Play size={18} /></span></div>
          {metrics?.topVideos.length ? <ol className="admin-popular-list">{metrics.topVideos.map((video, index) => <li key={video.id}><span className="admin-popular-rank">{String(index + 1).padStart(2, "0")}</span><Link href={`/video/${video.id}/`}><strong>{video.title}</strong><small>{video.channel}</small></Link><span className="admin-popular-views"><Eye size={13} />{formatNumber(video.views)}</span></li>)}</ol>
            : <div className="admin-empty-state"><Play size={21} /><strong>No video plays yet</strong><p>Videos appear here when visitors start playback.</p></div>}
        </section>
        <section className="admin-panel-card admin-quick-panel" aria-labelledby="admin-quick-title">
          <div className="admin-panel-heading"><div><p>CONTENT WORKSPACE</p><h2 id="admin-quick-title">Your catalog</h2><span>Read-only summary of current demo records</span></div><span className="admin-panel-icon"><Clapperboard size={19} /></span></div>
          <div className="admin-catalog-list">
            {[
              { id: "videos", title: "Videos", count: metrics?.totalVideos, icon: Clapperboard, href: "/#trending-videos", note: "Video library" },
              { id: "models", title: "Models", count: metrics?.totalModels, icon: UsersRound, href: "/pornstars/", note: "Performer directory" },
              { id: "channels", title: "Channels", count: metrics?.totalChannels, icon: Radio, href: "/channels/", note: "Channel directory" },
              { id: "categories", title: "Categories", count: metrics?.totalCategories, icon: Tags, href: "/categories/", note: "Browsing taxonomy" },
            ].map(({ icon: Icon, ...item }) => <div className="admin-catalog-row" id={item.id} key={item.id}><span className="admin-catalog-icon"><Icon size={17} /></span><span><strong>{item.title}</strong><small>{item.note}</small></span><b>{item.count === undefined ? "—" : formatNumber(item.count)}</b><Link href={item.href} aria-label={`View public ${item.title.toLowerCase()}`}><ArrowUpRight size={17} /></Link></div>)}
          </div>
        </section>
      </div>
      <p className="admin-dashboard-footnote"><ShieldCheck size={14} /><span>Anonymous browser-session analytics. Admin visits are excluded; plays are deduplicated for 30 minutes.</span></p>
    </AdminShell>
  );
}

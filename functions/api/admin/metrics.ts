import { categoryDirectory, channelDirectory, performers, videos } from "../../../lib/demo-content";
import { apiErrorResponse, jsonResponse, requireAdmin, type AdminEnv, type PagesContext } from "../../_shared/admin-auth";

type CountRow = { count: number };
type TotalsRow = { video_views: number; page_views: number; views_today: number };
type DayRow = { day: string; count: number };
type TopRow = { video_id: number; count: number };

export async function onRequestGet({ request, env }: PagesContext<AdminEnv>) {
  try {
    const session = await requireAdmin(request, env);
    if (!session) return jsonResponse({ error: "Please sign in again." }, 401);
    const now = new Date();
    const today = `${now.toISOString().slice(0, 10)}T00:00:00.000Z`;
    const weekStart = new Date(now);
    weekStart.setUTCDate(now.getUTCDate() - 6);
    weekStart.setUTCHours(0, 0, 0, 0);
    const [active, totals, days, topVideos] = await Promise.all([
      env.DB!.prepare("SELECT COUNT(*) AS count FROM analytics_visitors WHERE last_seen >= ?")
        .bind(new Date(now.getTime() - 5 * 60_000).toISOString()).first<CountRow>(),
      env.DB!.prepare(`SELECT COALESCE(SUM(event_type = 'video_view'), 0) AS video_views,
        COALESCE(SUM(event_type = 'page_view'), 0) AS page_views,
        COALESCE(SUM(event_type = 'video_view' AND created_at >= ?), 0) AS views_today FROM analytics_events`)
        .bind(today).first<TotalsRow>(),
      env.DB!.prepare(`SELECT substr(created_at, 1, 10) AS day, COUNT(*) AS count FROM analytics_events
        WHERE event_type = 'video_view' AND created_at >= ? GROUP BY day ORDER BY day ASC`)
        .bind(weekStart.toISOString()).all<DayRow>(),
      env.DB!.prepare(`SELECT video_id, COUNT(*) AS count FROM analytics_events WHERE event_type = 'video_view'
        GROUP BY video_id ORDER BY count DESC, video_id ASC LIMIT 5`).all<TopRow>(),
    ]);

    const counts = new Map((days.results ?? []).map((row) => [row.day, Number(row.count)]));
    const last7Days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(weekStart);
      date.setUTCDate(date.getUTCDate() + index);
      const key = date.toISOString().slice(0, 10);
      return { date: key, views: counts.get(key) ?? 0 };
    });

    return jsonResponse({
      activeVisitors: Number(active?.count ?? 0),
      totalViews: Number(totals?.video_views ?? 0),
      totalPageViews: Number(totals?.page_views ?? 0),
      viewsToday: Number(totals?.views_today ?? 0),
      totalVideos: videos.length,
      totalModels: performers.length,
      totalChannels: channelDirectory.length,
      totalCategories: categoryDirectory.length,
      last7Days,
      topVideos: (topVideos.results ?? []).flatMap((row) => {
        const video = videos.find((item) => item.id === row.video_id);
        return video ? [{ id: video.id, title: video.title, channel: video.channel, views: Number(row.count) }] : [];
      }),
      catalogSource: "demo",
      updatedAt: now.toISOString(),
    });
  } catch (error) {
    return apiErrorResponse(error, "Could not load metrics. Apply the D1 migration and check the DB binding.");
  }
}

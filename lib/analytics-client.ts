export type AnalyticsEventType = "page_view" | "heartbeat" | "video_view";
let memoryVisitorId: string | undefined;

function newId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function getVisitorId() {
  const key = "vidubuzz_anonymous_session";
  try {
    let id = sessionStorage.getItem(key);
    if (!id || !/^[a-f0-9-]{36}$/i.test(id)) {
      id = newId();
      sessionStorage.setItem(key, id);
    }
    return id;
  } catch {
    // Tracking must not break playback when private browsing blocks storage.
    memoryVisitorId ??= newId();
    return memoryVisitorId;
  }
}

export function recordAnalyticsEvent(type: AnalyticsEventType, path: string, videoId?: number) {
  if (typeof window === "undefined" || path.startsWith("/admin")) return;
  try {
    const payload = JSON.stringify({ type, eventId: newId(), path: path.slice(0, 400), visitorId: getVisitorId(),
      ...(videoId === undefined ? {} : { videoId }) });
    const body = new Blob([payload], { type: "application/json" });
    if (navigator.sendBeacon?.("/api/analytics/track", body)) return;
    void fetch("/api/analytics/track", {
      method: "POST", headers: { "content-type": "application/json" }, body: payload,
      credentials: "same-origin", keepalive: true,
    }).catch(() => undefined);
  } catch {
    // Analytics is best-effort and never a dependency of public navigation/playback.
  }
}

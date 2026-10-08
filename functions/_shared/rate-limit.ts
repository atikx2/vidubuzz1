import { ApiError, privateKeyHash, type AdminEnv, type D1Database } from "./admin-auth";

type RateRow = { attempts: number; window_started: number };

export async function consumeRateLimit(db: D1Database, keyHash: string, limit: number, windowSeconds: number) {
  const now = Math.floor(Date.now() / 1000);
  const cutoff = now - windowSeconds;
  const row = await db.prepare(`INSERT INTO api_rate_limits (key_hash, attempts, window_started) VALUES (?, 1, ?)
    ON CONFLICT(key_hash) DO UPDATE SET
      attempts = CASE WHEN window_started <= ? THEN 1 ELSE attempts + 1 END,
      window_started = CASE WHEN window_started <= ? THEN excluded.window_started ELSE window_started END
    RETURNING attempts, window_started`).bind(keyHash, now, cutoff, cutoff).first<RateRow>();
  if (!row) throw new Error("Rate limit storage unavailable");
  if (row.attempts > limit) {
    const retryAfter = Math.max(1, row.window_started + windowSeconds - now);
    throw new ApiError("Too many requests. Please try again later.", 429, { "retry-after": String(retryAfter) });
  }
}

export async function limitAdminRequest(request: Request, env: AdminEnv, action: "login" | "password") {
  // Cloudflare supplies this header. Raw IP addresses are never written to D1.
  const ip = request.headers.get("cf-connecting-ip") ?? "local";
  const key = await privateKeyHash(`admin:${action}:${ip}`, env.ADMIN_SESSION_SECRET!);
  await consumeRateLimit(env.DB!, key, action === "login" ? 10 : 5, 15 * 60);
}

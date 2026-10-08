PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS admin_users (
  email TEXT PRIMARY KEY NOT NULL,
  password_salt TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  session_version INTEGER NOT NULL DEFAULT 1,
  must_change_password INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS admin_sessions (
  id_hash TEXT PRIMARY KEY NOT NULL,
  email TEXT NOT NULL REFERENCES admin_users(email) ON DELETE CASCADE,
  session_version INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expiry ON admin_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_email ON admin_sessions(email);

CREATE TABLE IF NOT EXISTS api_rate_limits (
  key_hash TEXT PRIMARY KEY NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  window_started INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_api_rate_limits_window ON api_rate_limits(window_started);

CREATE TABLE IF NOT EXISTS analytics_visitors (
  visitor_hash TEXT PRIMARY KEY NOT NULL,
  last_seen TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_analytics_visitors_last_seen ON analytics_visitors(last_seen);

CREATE TABLE IF NOT EXISTS analytics_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  dedupe_key TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('page_view', 'video_view')),
  visitor_hash TEXT NOT NULL,
  page_path TEXT NOT NULL,
  video_id INTEGER,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_type_date ON analytics_events(event_type, created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_video_date ON analytics_events(video_id, event_type, created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_visitor_video ON analytics_events(visitor_hash, video_id, event_type, created_at);

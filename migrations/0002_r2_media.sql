-- R2 stores file bytes. D1 stores the upload intent and verified media metadata only.
CREATE TABLE IF NOT EXISTS media_assets (
  id TEXT PRIMARY KEY NOT NULL,
  object_key TEXT UNIQUE NOT NULL,
  purpose TEXT NOT NULL CHECK (purpose IN ('thumbnail', 'model-photo', 'channel-photo', 'preview')),
  original_filename TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL CHECK (size_bytes > 0),
  width INTEGER NOT NULL CHECK (width > 0),
  height INTEGER NOT NULL CHECK (height > 0),
  duration_seconds REAL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ready', 'rejected')),
  uploader_email TEXT NOT NULL REFERENCES admin_users(email),
  upload_expires_at TEXT NOT NULL,
  object_etag TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_media_assets_library ON media_assets(uploader_email, status, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_media_assets_purpose ON media_assets(uploader_email, status, purpose, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_media_assets_pending_expiry ON media_assets(status, upload_expires_at);

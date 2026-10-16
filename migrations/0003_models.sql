-- Admin model catalog. Public pages are exported at build time, never served by SSR.
CREATE TABLE IF NOT EXISTS models (
  id TEXT PRIMARY KEY NOT NULL,
  slug TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name TEXT NOT NULL,
  country_code TEXT,
  age INTEGER CHECK (age IS NULL OR (age >= 18 AND age <= 120)),
  description TEXT NOT NULL DEFAULT '',
  seo_title TEXT NOT NULL DEFAULT '',
  meta_description TEXT NOT NULL DEFAULT '',
  image_alt TEXT NOT NULL DEFAULT '',
  photo_asset_id TEXT REFERENCES media_assets(id),
  demo_image_path TEXT,
  adult_confirmed INTEGER NOT NULL DEFAULT 0 CHECK (adult_confirmed IN (0, 1)),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  source TEXT NOT NULL DEFAULT 'admin' CHECK (source IN ('admin', 'demo')),
  revision INTEGER NOT NULL DEFAULT 1,
  created_by TEXT REFERENCES admin_users(email),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_models_updated ON models(updated_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_models_name ON models(name COLLATE NOCASE, id);
CREATE INDEX IF NOT EXISTS idx_models_status_updated ON models(status, updated_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_models_country_name ON models(country_code, name COLLATE NOCASE, id);

-- Flat public slugs are shared with channel pages. Reserve names atomically.
CREATE TABLE IF NOT EXISTS content_slugs (
  slug TEXT PRIMARY KEY NOT NULL COLLATE NOCASE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('model', 'channel', 'system')),
  entity_id TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_content_slugs_entity ON content_slugs(entity_type, entity_id);
INSERT OR IGNORE INTO content_slugs (slug, entity_type, entity_id) VALUES ('admin', 'system', 'admin');
INSERT OR IGNORE INTO content_slugs (slug, entity_type, entity_id) VALUES ('api', 'system', 'api');
INSERT OR IGNORE INTO content_slugs (slug, entity_type, entity_id) VALUES ('_next', 'system', '_next');
INSERT OR IGNORE INTO content_slugs (slug, entity_type, entity_id) VALUES ('_not-found', 'system', '_not-found');
INSERT OR IGNORE INTO content_slugs (slug, entity_type, entity_id) VALUES ('categories', 'system', 'categories');
INSERT OR IGNORE INTO content_slugs (slug, entity_type, entity_id) VALUES ('channels', 'system', 'channels');
INSERT OR IGNORE INTO content_slugs (slug, entity_type, entity_id) VALUES ('pornstars', 'system', 'pornstars');
INSERT OR IGNORE INTO content_slugs (slug, entity_type, entity_id) VALUES ('video', 'system', 'video');
INSERT OR IGNORE INTO content_slugs (slug, entity_type, entity_id) VALUES ('models', 'system', 'models');
INSERT OR IGNORE INTO content_slugs (slug, entity_type, entity_id) VALUES ('media', 'system', 'media');
INSERT OR IGNORE INTO content_slugs (slug, entity_type, entity_id) VALUES ('assets', 'system', 'assets');
INSERT OR IGNORE INTO content_slugs (slug, entity_type, entity_id) VALUES ('search', 'system', 'search');
INSERT OR IGNORE INTO content_slugs (slug, entity_type, entity_id) VALUES ('page', 'system', 'page');
INSERT OR IGNORE INTO content_slugs (slug, entity_type, entity_id) VALUES ('sitemap', 'system', 'sitemap');
INSERT OR IGNORE INTO content_slugs (slug, entity_type, entity_id) VALUES ('robots', 'system', 'robots');
INSERT OR IGNORE INTO content_slugs (slug, entity_type, entity_id) VALUES ('velvet-room', 'channel', 'demo-channel-velvet-room');
INSERT OR IGNORE INTO content_slugs (slug, entity_type, entity_id) VALUES ('noir-studio', 'channel', 'demo-channel-noir-studio');
INSERT OR IGNORE INTO content_slugs (slug, entity_type, entity_id) VALUES ('golden-hour', 'channel', 'demo-channel-golden-hour');
INSERT OR IGNORE INTO content_slugs (slug, entity_type, entity_id) VALUES ('afterglow', 'channel', 'demo-channel-afterglow');
INSERT OR IGNORE INTO content_slugs (slug, entity_type, entity_id) VALUES ('blue-room', 'channel', 'demo-channel-blue-room');
INSERT OR IGNORE INTO content_slugs (slug, entity_type, entity_id) VALUES ('private-edit', 'channel', 'demo-channel-private-edit');
INSERT OR IGNORE INTO content_slugs (slug, entity_type, entity_id) VALUES ('studio-ember', 'channel', 'demo-channel-studio-ember');
INSERT OR IGNORE INTO content_slugs (slug, entity_type, entity_id) VALUES ('the-midnight-edit', 'channel', 'demo-channel-the-midnight-edit');
INSERT OR IGNORE INTO content_slugs (slug, entity_type, entity_id) VALUES ('luna-house', 'channel', 'demo-channel-luna-house');
INSERT OR IGNORE INTO content_slugs (slug, entity_type, entity_id) VALUES ('modern-muse', 'channel', 'demo-channel-modern-muse');

-- Preserve the six existing fictional demo profiles. No countries or ages are invented.
-- These are visibly labelled demo records in the admin list.
INSERT OR IGNORE INTO models (id, slug, name, description, image_alt, demo_image_path, adult_confirmed, status, source) VALUES ('demo-maya-sol', 'maya-sol', 'Maya Sol', 'Explore Maya Sol on Vidubuzz. Browse this demo profile, discover featured video appearances, and explore related channels. Replace this sample biography with verified, unique information before publishing a real model profile.', 'Maya Sol portrait', '/media/thumb-01-240x135.jpg', 1, 'published', 'demo');
INSERT OR IGNORE INTO content_slugs (slug, entity_type, entity_id) VALUES ('maya-sol', 'model', 'demo-maya-sol');
INSERT OR IGNORE INTO models (id, slug, name, description, image_alt, demo_image_path, adult_confirmed, status, source) VALUES ('demo-lena-vale', 'lena-vale', 'Lena Vale', 'Explore Lena Vale on Vidubuzz. Browse this demo profile, discover featured video appearances, and explore related channels. Replace this sample biography with verified, unique information before publishing a real model profile.', 'Lena Vale portrait', '/media/thumb-02-240x135.jpg', 1, 'published', 'demo');
INSERT OR IGNORE INTO content_slugs (slug, entity_type, entity_id) VALUES ('lena-vale', 'model', 'demo-lena-vale');
INSERT OR IGNORE INTO models (id, slug, name, description, image_alt, demo_image_path, adult_confirmed, status, source) VALUES ('demo-amara-voss', 'amara-voss', 'Amara Voss', 'Explore Amara Voss on Vidubuzz. Browse this demo profile, discover featured video appearances, and explore related channels. Replace this sample biography with verified, unique information before publishing a real model profile.', 'Amara Voss portrait', '/media/thumb-03-240x135.jpg', 1, 'published', 'demo');
INSERT OR IGNORE INTO content_slugs (slug, entity_type, entity_id) VALUES ('amara-voss', 'model', 'demo-amara-voss');
INSERT OR IGNORE INTO models (id, slug, name, description, image_alt, demo_image_path, adult_confirmed, status, source) VALUES ('demo-sofia-lane', 'sofia-lane', 'Sofia Lane', 'Explore Sofia Lane on Vidubuzz. Browse this demo profile, discover featured video appearances, and explore related channels. Replace this sample biography with verified, unique information before publishing a real model profile.', 'Sofia Lane portrait', '/media/thumb-01-240x135.jpg', 1, 'published', 'demo');
INSERT OR IGNORE INTO content_slugs (slug, entity_type, entity_id) VALUES ('sofia-lane', 'model', 'demo-sofia-lane');
INSERT OR IGNORE INTO models (id, slug, name, description, image_alt, demo_image_path, adult_confirmed, status, source) VALUES ('demo-jade-rivers', 'jade-rivers', 'Jade Rivers', 'Explore Jade Rivers on Vidubuzz. Browse this demo profile, discover featured video appearances, and explore related channels. Replace this sample biography with verified, unique information before publishing a real model profile.', 'Jade Rivers portrait', '/media/thumb-02-240x135.jpg', 1, 'published', 'demo');
INSERT OR IGNORE INTO content_slugs (slug, entity_type, entity_id) VALUES ('jade-rivers', 'model', 'demo-jade-rivers');
INSERT OR IGNORE INTO models (id, slug, name, description, image_alt, demo_image_path, adult_confirmed, status, source) VALUES ('demo-mila-hart', 'mila-hart', 'Mila Hart', 'Explore Mila Hart on Vidubuzz. Browse this demo profile, discover featured video appearances, and explore related channels. Replace this sample biography with verified, unique information before publishing a real model profile.', 'Mila Hart portrait', '/media/thumb-03-240x135.jpg', 1, 'published', 'demo');
INSERT OR IGNORE INTO content_slugs (slug, entity_type, entity_id) VALUES ('mila-hart', 'model', 'demo-mila-hart');

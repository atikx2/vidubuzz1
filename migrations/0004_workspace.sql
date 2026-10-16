CREATE TABLE IF NOT EXISTS catalog_entries (
  id TEXT PRIMARY KEY NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('channel', 'category')),
  slug TEXT NOT NULL COLLATE NOCASE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  seo_title TEXT NOT NULL DEFAULT '',
  meta_description TEXT NOT NULL DEFAULT '',
  image_alt TEXT NOT NULL DEFAULT '',
  photo_asset_id TEXT REFERENCES media_assets(id),
  demo_image_path TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  source TEXT NOT NULL DEFAULT 'admin' CHECK (source IN ('admin', 'demo')),
  revision INTEGER NOT NULL DEFAULT 1,
  created_by TEXT REFERENCES admin_users(email),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE(kind, slug)
);

CREATE INDEX IF NOT EXISTS idx_catalog_kind_status_updated ON catalog_entries(kind, status, updated_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_catalog_kind_name ON catalog_entries(kind, name COLLATE NOCASE, id);

CREATE TABLE IF NOT EXISTS site_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  settings_json TEXT NOT NULL CHECK (json_valid(settings_json)),
  revision INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

INSERT OR IGNORE INTO site_settings (id, settings_json) VALUES (1, '{"brandName":"Vidubuzz","tagline":"Discover videos, models and channels.","siteUrl":"","publicEmail":"","removalEmail":"","footerText":"Adults only · 18+ or the legal age in your location.","homeTitle":"Trending Videos | Vidubuzz","homeDescription":"Discover videos, explore model profiles, and browse channels and categories on Vidubuzz.","googleVerification":"","bingVerification":"","indexSite":true,"indexModels":true,"indexChannels":true,"indexCategories":true,"indexPages":true,"theme":{"accent":"#f04d71","background":"#17151b","surface":"#211f27","text":"#fcfbfd"}}');

CREATE TABLE IF NOT EXISTS site_pages (
  slug TEXT PRIMARY KEY NOT NULL CHECK (slug IN ('about', 'contact', 'privacy', 'terms', 'content-removal')),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  review_confirmed INTEGER NOT NULL DEFAULT 0 CHECK (review_confirmed IN (0, 1)),
  noindex INTEGER NOT NULL DEFAULT 1 CHECK (noindex IN (0, 1)),
  revision INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_site_pages_status ON site_pages(status, slug);

INSERT OR IGNORE INTO content_slugs (slug, entity_type, entity_id) VALUES ('about', 'system', 'about');

INSERT OR IGNORE INTO content_slugs (slug, entity_type, entity_id) VALUES ('contact', 'system', 'contact');

INSERT OR IGNORE INTO content_slugs (slug, entity_type, entity_id) VALUES ('privacy', 'system', 'privacy');

INSERT OR IGNORE INTO content_slugs (slug, entity_type, entity_id) VALUES ('terms', 'system', 'terms');

INSERT OR IGNORE INTO content_slugs (slug, entity_type, entity_id) VALUES ('content-removal', 'system', 'content-removal');

INSERT OR IGNORE INTO catalog_entries (id, kind, slug, name, description, image_alt, demo_image_path, status, source) VALUES ('demo-channel-velvet-room', 'channel', 'velvet-room', 'Velvet Room', 'This is a fictional demo channel for the Vidubuzz layout. Replace this sample introduction with verified, original information before publishing a real channel.', 'Velvet Room thumbnail', '/media/thumb-01-240x135.jpg', 'published', 'demo');

INSERT OR IGNORE INTO content_slugs (slug, entity_type, entity_id) VALUES ('velvet-room', 'channel', 'demo-channel-velvet-room');

INSERT OR IGNORE INTO catalog_entries (id, kind, slug, name, description, image_alt, demo_image_path, status, source) VALUES ('demo-channel-noir-studio', 'channel', 'noir-studio', 'Noir Studio', 'This is a fictional demo channel for the Vidubuzz layout. Replace this sample introduction with verified, original information before publishing a real channel.', 'Noir Studio thumbnail', '/media/thumb-02-240x135.jpg', 'published', 'demo');

INSERT OR IGNORE INTO content_slugs (slug, entity_type, entity_id) VALUES ('noir-studio', 'channel', 'demo-channel-noir-studio');

INSERT OR IGNORE INTO catalog_entries (id, kind, slug, name, description, image_alt, demo_image_path, status, source) VALUES ('demo-channel-golden-hour', 'channel', 'golden-hour', 'Golden Hour', 'This is a fictional demo channel for the Vidubuzz layout. Replace this sample introduction with verified, original information before publishing a real channel.', 'Golden Hour thumbnail', '/media/thumb-03-240x135.jpg', 'published', 'demo');

INSERT OR IGNORE INTO content_slugs (slug, entity_type, entity_id) VALUES ('golden-hour', 'channel', 'demo-channel-golden-hour');

INSERT OR IGNORE INTO catalog_entries (id, kind, slug, name, description, image_alt, demo_image_path, status, source) VALUES ('demo-channel-afterglow', 'channel', 'afterglow', 'Afterglow', 'This is a fictional demo channel for the Vidubuzz layout. Replace this sample introduction with verified, original information before publishing a real channel.', 'Afterglow thumbnail', '/media/thumb-01-240x135.jpg', 'published', 'demo');

INSERT OR IGNORE INTO content_slugs (slug, entity_type, entity_id) VALUES ('afterglow', 'channel', 'demo-channel-afterglow');

INSERT OR IGNORE INTO catalog_entries (id, kind, slug, name, description, image_alt, demo_image_path, status, source) VALUES ('demo-channel-blue-room', 'channel', 'blue-room', 'Blue Room', 'This is a fictional demo channel for the Vidubuzz layout. Replace this sample introduction with verified, original information before publishing a real channel.', 'Blue Room thumbnail', '/media/thumb-02-240x135.jpg', 'published', 'demo');

INSERT OR IGNORE INTO content_slugs (slug, entity_type, entity_id) VALUES ('blue-room', 'channel', 'demo-channel-blue-room');

INSERT OR IGNORE INTO catalog_entries (id, kind, slug, name, description, image_alt, demo_image_path, status, source) VALUES ('demo-channel-private-edit', 'channel', 'private-edit', 'Private Edit', 'This is a fictional demo channel for the Vidubuzz layout. Replace this sample introduction with verified, original information before publishing a real channel.', 'Private Edit thumbnail', '/media/thumb-03-240x135.jpg', 'published', 'demo');

INSERT OR IGNORE INTO content_slugs (slug, entity_type, entity_id) VALUES ('private-edit', 'channel', 'demo-channel-private-edit');

INSERT OR IGNORE INTO catalog_entries (id, kind, slug, name, description, image_alt, demo_image_path, status, source) VALUES ('demo-channel-studio-ember', 'channel', 'studio-ember', 'Studio Ember', 'This is a fictional demo channel for the Vidubuzz layout. Replace this sample introduction with verified, original information before publishing a real channel.', 'Studio Ember thumbnail', '/media/thumb-01-240x135.jpg', 'published', 'demo');

INSERT OR IGNORE INTO content_slugs (slug, entity_type, entity_id) VALUES ('studio-ember', 'channel', 'demo-channel-studio-ember');

INSERT OR IGNORE INTO catalog_entries (id, kind, slug, name, description, image_alt, demo_image_path, status, source) VALUES ('demo-channel-the-midnight-edit', 'channel', 'the-midnight-edit', 'The Midnight Edit', 'This is a fictional demo channel for the Vidubuzz layout. Replace this sample introduction with verified, original information before publishing a real channel.', 'The Midnight Edit thumbnail', '/media/thumb-02-240x135.jpg', 'published', 'demo');

INSERT OR IGNORE INTO content_slugs (slug, entity_type, entity_id) VALUES ('the-midnight-edit', 'channel', 'demo-channel-the-midnight-edit');

INSERT OR IGNORE INTO catalog_entries (id, kind, slug, name, description, image_alt, demo_image_path, status, source) VALUES ('demo-channel-luna-house', 'channel', 'luna-house', 'Luna House', 'This is a fictional demo channel for the Vidubuzz layout. Replace this sample introduction with verified, original information before publishing a real channel.', 'Luna House thumbnail', '/media/thumb-03-240x135.jpg', 'published', 'demo');

INSERT OR IGNORE INTO content_slugs (slug, entity_type, entity_id) VALUES ('luna-house', 'channel', 'demo-channel-luna-house');

INSERT OR IGNORE INTO catalog_entries (id, kind, slug, name, description, image_alt, demo_image_path, status, source) VALUES ('demo-channel-modern-muse', 'channel', 'modern-muse', 'Modern Muse', 'This is a fictional demo channel for the Vidubuzz layout. Replace this sample introduction with verified, original information before publishing a real channel.', 'Modern Muse thumbnail', '/media/thumb-01-240x135.jpg', 'published', 'demo');

INSERT OR IGNORE INTO content_slugs (slug, entity_type, entity_id) VALUES ('modern-muse', 'channel', 'demo-channel-modern-muse');

INSERT OR IGNORE INTO catalog_entries (id, kind, slug, name, description, image_alt, demo_image_path, status, source) VALUES ('demo-category-amateur', 'category', 'amateur', 'Amateur', 'This is a fictional demo category for the Vidubuzz layout. Replace this sample introduction with verified, original information before publishing a real category.', 'Amateur thumbnail', '/media/thumb-01-240x135.jpg', 'published', 'demo');

INSERT OR IGNORE INTO catalog_entries (id, kind, slug, name, description, image_alt, demo_image_path, status, source) VALUES ('demo-category-black', 'category', 'black', 'Black', 'This is a fictional demo category for the Vidubuzz layout. Replace this sample introduction with verified, original information before publishing a real category.', 'Black thumbnail', '/media/thumb-02-240x135.jpg', 'published', 'demo');

INSERT OR IGNORE INTO catalog_entries (id, kind, slug, name, description, image_alt, demo_image_path, status, source) VALUES ('demo-category-asian', 'category', 'asian', 'Asian', 'This is a fictional demo category for the Vidubuzz layout. Replace this sample introduction with verified, original information before publishing a real category.', 'Asian thumbnail', '/media/thumb-03-240x135.jpg', 'published', 'demo');

INSERT OR IGNORE INTO catalog_entries (id, kind, slug, name, description, image_alt, demo_image_path, status, source) VALUES ('demo-category-blonde', 'category', 'blonde', 'Blonde', 'This is a fictional demo category for the Vidubuzz layout. Replace this sample introduction with verified, original information before publishing a real category.', 'Blonde thumbnail', '/media/thumb-01-240x135.jpg', 'published', 'demo');

INSERT OR IGNORE INTO catalog_entries (id, kind, slug, name, description, image_alt, demo_image_path, status, source) VALUES ('demo-category-brunette', 'category', 'brunette', 'Brunette', 'This is a fictional demo category for the Vidubuzz layout. Replace this sample introduction with verified, original information before publishing a real category.', 'Brunette thumbnail', '/media/thumb-02-240x135.jpg', 'published', 'demo');

INSERT OR IGNORE INTO catalog_entries (id, kind, slug, name, description, image_alt, demo_image_path, status, source) VALUES ('demo-category-milf', 'category', 'milf', 'MILF', 'This is a fictional demo category for the Vidubuzz layout. Replace this sample introduction with verified, original information before publishing a real category.', 'MILF thumbnail', '/media/thumb-03-240x135.jpg', 'published', 'demo');

INSERT OR IGNORE INTO catalog_entries (id, kind, slug, name, description, image_alt, demo_image_path, status, source) VALUES ('demo-category-lesbian', 'category', 'lesbian', 'Lesbian', 'This is a fictional demo category for the Vidubuzz layout. Replace this sample introduction with verified, original information before publishing a real category.', 'Lesbian thumbnail', '/media/thumb-01-240x135.jpg', 'published', 'demo');

INSERT OR IGNORE INTO catalog_entries (id, kind, slug, name, description, image_alt, demo_image_path, status, source) VALUES ('demo-category-pov', 'category', 'pov', 'POV', 'This is a fictional demo category for the Vidubuzz layout. Replace this sample introduction with verified, original information before publishing a real category.', 'POV thumbnail', '/media/thumb-02-240x135.jpg', 'published', 'demo');

INSERT OR IGNORE INTO catalog_entries (id, kind, slug, name, description, image_alt, demo_image_path, status, source) VALUES ('demo-category-couples', 'category', 'couples', 'Couples', 'This is a fictional demo category for the Vidubuzz layout. Replace this sample introduction with verified, original information before publishing a real category.', 'Couples thumbnail', '/media/thumb-03-240x135.jpg', 'published', 'demo');

INSERT OR IGNORE INTO catalog_entries (id, kind, slug, name, description, image_alt, demo_image_path, status, source) VALUES ('demo-category-anal', 'category', 'anal', 'Anal', 'This is a fictional demo category for the Vidubuzz layout. Replace this sample introduction with verified, original information before publishing a real category.', 'Anal thumbnail', '/media/thumb-01-240x135.jpg', 'published', 'demo');

INSERT OR IGNORE INTO site_pages (slug, title, description, body) VALUES ('about', 'About us', 'Learn about the website and its catalog.', 'Introduce your website, who operates it, and the purpose of the catalog. Explain which information is verified and clearly distinguish sample profiles from real content. Add only statements you can support.');

INSERT OR IGNORE INTO site_pages (slug, title, description, body) VALUES ('contact', 'Contact', 'How to contact the website operator.', 'Add your public contact email in Settings, then explain which inquiries you accept and what details people should include. Do not promise a response time unless your team can meet it.');

INSERT OR IGNORE INTO site_pages (slug, title, description, body) VALUES ('privacy', 'Privacy policy', 'How this website handles personal information.', 'DRAFT FOR OWNER REVIEW — NOT LEGAL ADVICE.

Explain who operates the site and how to contact the data controller.

Describe the anonymous browser-session analytics, page visits, video-play counts, rate limiting, administrator cookies and hosting logs actually used by your deployment. Document retention periods, relevant legal grounds, visitor rights and any third-party services.

Review your video providers and hosting configuration before describing their privacy practices. Replace this draft with an accurate policy appropriate to your jurisdiction.');

INSERT OR IGNORE INTO site_pages (slug, title, description, body) VALUES ('terms', 'Terms of use', 'The rules for using this website.', 'DRAFT FOR OWNER REVIEW — NOT LEGAL ADVICE.

Describe the website operator and require visitors to be at least 18 and meet the legal age in their location.

Set rules for lawful use, intellectual-property rights, external video providers and complaints. State only rights, licenses and commitments that your operation actually has.

Have the final terms reviewed for your jurisdiction before publishing.');

INSERT OR IGNORE INTO site_pages (slug, title, description, body) VALUES ('content-removal', 'Content removal', 'How to report rights, consent or safety concerns.', 'DRAFT FOR OWNER REVIEW — NOT LEGAL ADVICE.

Set a monitored reporting email in Settings. Explain how a rights holder or affected person can send the exact page URL, identify the disputed material, explain the concern and provide a safe contact method.

Do not ask people to email passwords, payment details or unnecessary sensitive identity documents. Establish a real review and escalation process, especially for consent, impersonation or suspected underage content.

Publish only procedures and response commitments that you can carry out.');

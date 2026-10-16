# Admin workspace and static publishing

The workspace includes Models, Channels, Categories, Settings, information Pages, API & Connections, Media, Analytics and the existing admin account/profile. **Video management/import/provider integrations remain a later task.** There is no visitor account, public API-key issuance, scraping or Worker SSR.

## Existing installation: phone-friendly first step

If admin login, R2 and migration `0003_models.sql` already work, **do not repeat the initial account setup or change existing secrets**.

1. Open the **newest Pages deployment** and sign in.
2. Open **Admin → API → Workspace database update**.
3. Tap **Copy complete SQL**. If clipboard permissions are blocked, use **Show SQL** or **Download SQL** instead.
4. In Cloudflare, open **D1 → the existing database bound as `DB` → Console**. Paste and run the **entire** SQL. Do not create a second database and do not assume a database name from an example.
5. The final SELECT should return **20 catalog entries and 5 information pages** on an untouched installation. A larger catalog count is normal if content already exists. DDL statements saying “no data” are not a failure by themselves.
6. Return to **API → Refresh**. The database update should be ready. Channels, Categories, Settings and Pages can now save to D1.

This is `migrations/0004_workspace.sql`. It adds the catalog, revisioned site settings and five private information drafts, reserves their URLs, and seeds ten fictional demo channels and ten placeholder categories. It preserves existing admin credentials, Models and media. Re-running it preserves edited records. It does **not** scrape or import another site's taxonomy.

For a brand-new installation, apply `0001_admin_analytics.sql`, `0002_r2_media.sql`, `0003_models.sql`, then `0004_workspace.sql` to the same database, following the [admin](admin-setup.md) and [R2](r2-setup.md) guides. Never rerun initial account setup to repair an existing account.

## What saves, and what becomes public?

- **Save** writes metadata to D1. It does not change the already-exported website.
- **Draft** and **Archived** records stay out of the next public snapshot.
- **Public · next build** selects a record for the next successful build; it does not mean deployed.
- **Publish site** queues a branch-specific Cloudflare Pages build. A queued request is not proof that the build succeeded or that credentials are valid.
- Public pages, directories, search indexes, metadata, footer links and sitemap are generated at build time. Visitors do not query a catalog API/D1 on each page view. Existing anonymous analytics requests are separate and remain enabled.
- Save a batch of changes, publish once, and inspect **Pages → Deployments**. Old hash deployment URLs are immutable; open the new deployment URL rather than expecting the old URL to update.

## Everyday editing

### Models

**Create Model → name → adult/permission confirmation → Save draft.** These are the only requirements for a draft. Photo and introduction can wait. An ASCII URL is generated automatically, including a safe fallback for non-Latin-only names. Saved URLs cannot change here.

To select Public, add a verified R2 image and an original introduction. **More details & SEO** contains optional country, verified adult age (18–120), SEO title, description and image alt text. Unknown facts stay absent; the editor does not invent a country, age or biography. See [Models](models-setup.md) for the detailed flow.

### Channels and Categories

Both have searchable, status-filtered, sortable 12-row admin pages and Create/Edit dialogs. A name is enough to start a draft; the URL and SEO defaults are automatic. **More details & SEO** is optional. The URL is immutable after the first save.

- A public **Channel** needs its introduction and a verified R2 photo.
- A public **Category** needs its introduction; its image is optional and otherwise uses a neutral graphic.
- Channel URLs share the flat `/slug/` namespace with Models and reserved system routes. Categories use `/categories/slug/`.
- Fictional imported demo entries are explicitly labelled. Editing a demo converts it to a managed record; supply the real required content before selecting Public.
- Public directories have real 24-item pages and empty states, not invented page counts. New managed entries have zero linked videos until explicit associations arrive with the later Video editor. Matching a demo name does not create fake relationships or views.

### Settings

**General** controls the site name, tagline, public HTTPS canonical origin, public contact/removal addresses and footer notice. The admin sign-in address is never used as a public contact default. Leave unknown public contact details empty.

**SEO & Search Console** controls the homepage title/description, global and entity indexing switches, Google HTML verification content token, and optional Bing token.

1. In Search Console choose an HTML meta-tag verification method for the correct HTTPS property.
2. Copy only the `content` value, not the whole meta tag, an OAuth token or an API key.
3. Save Settings, complete a successful static build, then return to Search Console and press **Verify** yourself. Saving a token does not validate ownership or guarantee indexing/rankings. DNS/domain-property verification must be completed at the DNS provider instead.

**Colors & appearance** offers four palettes and custom accent/page/card/text colors. Plain six-digit hex only; text must have at least 4.5:1 contrast on both configured backgrounds, and the accent at least 3:1. Derived secondary labels/link text and accent-button text retain readable contrast. Light and dark native controls follow the chosen public palette. The private admin UI keeps its own dark controls. The preview is illustrative; saving does not recolor the live deployment until a successful build.

### About, Contact, Privacy, Terms and Content removal

These five pages start as **private drafts**. Legal starter instructions are not completed policies and must not be presented as legal advice or compliance certification.

1. Choose a page, replace its starter instructions with accurate, site-specific plain text, and review the title/description. Paragraph breaks and `## Heading` lines are supported; custom HTML/scripts are not.
2. Use **Preview** to review the text. Save a draft whenever needed.
3. To publish, select **Public · next build**, confirm you reviewed it, and save. Untouched starter instructions are rejected.
4. Contact requires a public contact address in Settings. Content removal requires a monitored reporting address. No fake form success, invented operator identity, legal response deadline or automatic compliance promise is supplied.
5. Choose whether that page should stay out of search engines. Information drafts default to noindex.

Only reviewed, public pages get exported routes and footer links. Setting a page back to Draft removes it from the **next successful deployment**, not old deployment history or search caches.

### API & Connections

This page is an authenticated status/setup screen plus API documentation, **not external integrations or a public API/key generator**. It checks D1/schema presence, the configured R2 fields/binding, and publishing settings. It never exposes passwords, upload keys, D1 read tokens or deploy-hook URLs.

**Ready means configuration is present, not a live credential/permission test.** A successful upload, build/deployment log or explicit provider verification is the evidence for those operations. Do not treat these indicators as a production CPU measurement.

## Enable static publishing (private Cloudflare setup)

Without build-read access, admin saves work but the exported website continues using the demo fallback. In the Pages project, use **Settings → Variables and Secrets** for the environment you are actually deploying. Preview and Production have separate bindings/settings.

| Setting | Type | Purpose |
| --- | --- | --- |
| `DB` | D1 binding | Existing admin database; migrations 0001–0004 must be applied. |
| `D1_DATABASE_ID` | Text | UUID of that same database, not its name or the binding name. |
| `D1_READ_TOKEN` | Encrypted secret | Cloudflare **Account → D1 → Read** token, restricted to the account containing the database. |
| `R2_ACCOUNT_ID` | Existing text | Cloudflare account containing D1 and the current R2 setup. |
| `R2_PUBLIC_BASE_URL` | Existing text | Public HTTPS image origin, e.g. `https://assets.vidubuzz.top`, not the private S3 endpoint. |
| `PAGES_DEPLOY_HOOK` | Encrypted secret, optional | Private Pages deploy hook for the correct branch; enables the Publish site button. |
| `NEXT_PUBLIC_SITE_URL` | Optional public text | Default canonical HTTPS origin when no origin is saved in Settings. |

Keep the existing R2 upload variables, `ASSETS_BUCKET` binding, admin pepper and session secret unchanged. Read-only D1 access is enough for snapshot SELECT queries; it is still sensitive/account-scoped. Never put private values into `NEXT_PUBLIC_*`, chat, screenshots, Git or a public JSON file. The build script does not automatically read `.dev.vars`.

Build command: **`npm run build`**. Output: **`out`**. After adding settings, redeploy. A managed build logs:

```text
Static site snapshot: <number> public models, <number> public catalog entries, <number> reviewed pages.
```

Without either D1 build credential it logs:

```text
Static site snapshot: demo fallback; no D1 publishing credentials configured.
```

Partial D1 configuration, missing migration/settings, invalid public images, inconsistent URL ownership or concurrent metadata changes fail the build; they do not silently publish demos/partial data. A genuinely empty configured public selection stays empty.

### Optional Publish site button

1. Pages project → **Settings → Builds / Build & deployments → Deploy hooks → Add deploy hook**.
2. Give it a useful name such as `Site catalog`.
3. For this Arena session set the branch to **`arena/a87a8bb1-vidubuzz1`**. A hook for `main` builds different code. The app cannot inspect the private hook's branch, so check it in Cloudflare.
4. Save the URL as encrypted `PAGES_DEPLOY_HOOK` in the same Pages environment, then redeploy.
5. The app permits only the Cloudflare Pages HTTPS hook endpoint, follows no redirects, requires an authenticated same-origin POST, and shares one limit of three publish requests per 15 minutes across all publish buttons/legacy endpoint.

A manual Git/Pages build can publish saved data without this hook when the private build-read setup is present.

## SEO, privacy and operating limits

- Public metadata uses the configured branding, canonical origin, entity SEO defaults/overrides, Open Graph/Twitter and escaped JSON-LD. Sitemap includes eligible published records/reviewed pages; demo and noindex information entries are excluded.
- Global indexing off generates noindex metadata plus an `X-Robots-Tag` static header across the export. Admin/API routes remain excluded from crawling. Crawl directives are not authorization or a way to erase old public copies.
- Draft/unreviewed/archived content, account data, internal photo-reference/ownership fields and private configuration are excluded from public snapshots. Client card indexes omit biographies, policy bodies and SEO overrides; API Functions use compact route/status metadata, not the full catalog.
- Writes are session-protected, same-origin, bounded, prepared and rate-limited. Revision conflicts return 409 rather than overwriting another tab's changes. Editors warn on unsaved navigation.
- This is a bounded small-catalog exporter, not a million-record CMS. Models are bounded below 10,000 public rows and catalog entries below 20,000 in this version. Large catalogs require sharded snapshots/sitemaps and a Pages build/file-count plan before raising those limits.
- Archiving/drafting updates a future deployment only. Old immutable deployments, search caches and shared immutable R2 assets need separate account-side removal when required. Do not manually delete a photo still referenced by another record.
- Main video stays at the provider stream URL. R2 is for photos/thumbnails/short previews. Native public R2 delivery is not a Worker proxy; operations/storage and paid excess still matter. No unlimited-free or measured ≤10 ms admin Function claim is made.

## Local verification

```bash
npm ci
npm run lint
npm test
npm run db:local
npm run build
npm run pages:dev
```

Use synthetic local credentials in ignored `.dev.vars`; never copy real production passwords or tokens for QA. `npm run dev` runs Next on `0.0.0.0`; authenticated APIs need the Pages emulator. `npm run models:sync` is the legacy script name for the coordinated **whole-site** snapshot.

Automated tests cover auth/origin checks, migration preservation/readiness, minimal drafts, revisions/URL reservations, R2 image ownership/readiness, filtering/pagination, settings/readability, reviewed pages, shared publish limits, snapshot privacy and fail-closed/consistency rules. Local browser tests are not proof of live Cloudflare upload credentials, hook configuration or production CPU usage.

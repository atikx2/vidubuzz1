# Models: D1 editing + static public pages

This chunk adds `/admin/models/`. It does **not** add visitor login, Worker SSR, video uploads, a video editor or a channel editor. Existing admin credentials and R2 upload settings stay unchanged.

## How it works

- Admin metadata is saved in the existing D1 `DB` binding.
- Photos use verified images from the R2 media library, or the same direct-to-R2 upload flow used by `/admin/media/`.
- A new profile starts as **Draft**. Name, a stable URL slug, a plain-text description and adult/permission confirmation are required. Country and age are optional; missing values remain absent from public profiles. A supplied age must be an integer from 18 to 120.
- **Public · next build** means eligible for a future build, **not already live**. A verified R2 image is required for that status.
- **Archived** retains the record but excludes it from the next build. There is no destructive delete or slug-renaming UI.
- `npm run build` reads published/adult-confirmed metadata through the private D1 REST API before Next.js runs. It generates ignored `.generated/models.json`, a compact card index without biographies, and API-only snapshot/slug metadata, then exports the public directory, model detail pages, related rows, metadata and sitemap to `out/`.
- Public model pages do not call a model API or D1 per visitor. Existing anonymous analytics are unchanged. Public R2 requests still count toward R2 operations/storage; this is not a promise of unlimited free use or a measured <=10 ms CPU guarantee for admin Functions.

## 1. Apply the model migration

In Cloudflare **Workers & Pages → D1 → your existing admin database → Console**, run the contents of:

```text
migrations/0003_models.sql
```

Apply it to the same database already bound as `DB` in this Pages environment. Migration `0002_r2_media.sql` must already be present. This adds `models`, `content_slugs` and indexes; it does not reset passwords or media.

The migration imports the six existing **fictional demo profiles** so the admin list is not disconnected from the current prototype. They are visibly labelled, carry no invented country or age, and retain their legacy demo photos until converted. Demo detail pages are `noindex` and omitted from the model sitemap entries. Saving an edited demo converts it to a managed record; choose a real R2 photo and explicitly confirm adult/permission status before making it public.

Refresh `/admin/models/`. Create, edit, search, filter and paginate are usable after this step, even before publishing is configured.

## 2. Configure build-time D1 access

Go to the Pages project **Settings → Variables and Secrets**. Use the environment you are actually deploying:

- This session's fixed branch is `arena/a87a8bb1-vidubuzz1`, normally a **Preview** environment.
- Production has separate settings. Do not assume Preview secrets/bindings automatically exist in Production, or vice versa.

Add:

| Setting | Type | Value |
| --- | --- | --- |
| `D1_DATABASE_ID` | Text | The UUID of the **same** D1 database bound as `DB`, copied from its database overview. Not its name or binding name. |
| `D1_READ_TOKEN` | Encrypted secret | A private Cloudflare API token with **Account → D1 → Read**, scoped to the account containing this database. |
| `NEXT_PUBLIC_SITE_URL` | Text, optional | Your final public HTTPS site origin, without a path, for example `https://vidubuzz.top`. This value is intentionally public, unlike the token. |

Existing text variables `R2_ACCOUNT_ID` and `R2_PUBLIC_BASE_URL` must also be present in the build environment. The account ID must belong to the D1 database as well as the existing R2 setup. The public image origin is typically `https://assets.vidubuzz.top`.

To create the read token: Cloudflare profile → **API Tokens → Create Token → Custom token**. Choose only **Account / D1 / Read** and the correct account. Do not give it R2 upload or account-wide edit permissions. The D1 query endpoint accepts the D1 Read permission; the build sends only SELECT queries. Cloudflare's permission is account-scoped, so treat the token as sensitive even though this code queries only the specified database.

Do not paste tokens, S3 keys, passwords or hook URLs into chat, screenshots, Git or a `NEXT_PUBLIC_*` variable. Keep the existing admin pepper/session secrets unchanged.

The build command remains **`npm run build`** and the output directory remains **`out`**. Redeploy after adding settings. Confirm the build log says:

```text
Static model snapshot: <number> published profiles.
```

If both D1 build settings are absent, the existing demo catalog remains in use. If only part of the setup is present, D1 access fails, a public image is invalid, or the catalog changes during snapshot generation, the build fails instead of silently publishing demos/partial data. An empty configured public selection is genuinely empty, not a demo fallback.

## 3. Optional: enable the admin Publish site button

Without a deploy hook you can still publish by retrying a Pages deployment or triggering a Git build, with the settings from step 2 present.

For the button:

1. Pages project → **Settings → Builds / Build & deployments → Deploy hooks → Add deploy hook**.
2. Name it `Model catalog` (any useful name is fine).
3. Set **Branch to build** to **`arena/a87a8bb1-vidubuzz1`** for this session. A hook for `main` would deploy different code/environment; the application cannot inspect the hook's branch, so check this carefully.
4. Save its private URL as the encrypted **`PAGES_DEPLOY_HOOK`** variable in this same Pages environment.
5. Redeploy so the Function can see the new secret. The Models page enables **Publish site** when the migration and required publishing settings are present.

The server accepts only HTTPS `api.cloudflare.com/client/v4/pages/webhooks/deploy_hooks/...` URLs, follows no redirects, requires an authenticated same-origin POST, and rate limits publishing to three requests per 15 minutes. The URL is never returned to the browser. Hook configuration readiness is not proof of valid credentials or a successful deployment: the Cloudflare build log is the source of truth.

## 4. Day-to-day flow

1. Open **Admin → Models → Create Model**.
2. Enter the name; review the automatically generated slug before the first save. Non-Latin names may need a manually entered Latin URL slug. Saved slugs cannot be changed here, to avoid broken links.
3. Add country and/or verified adult age only if known. Otherwise leave them empty.
4. Write a unique, useful description. Optional SEO title, meta description and image alt text have safe defaults and a search-result preview. Search engines can rewrite snippets; no ranking is guaranteed.
5. Choose an existing verified R2 image, or **Upload photo**. Upload byte limits, CORS and verification are the same as the Media library. Only images are offered; preview/main videos cannot be profile photos. If verification fails after a PUT, retry verification rather than uploading a duplicate file.
6. Confirm the profile is adult-only and you have permission to use its content.
7. Save Draft while working. Choose **Public · next build** when ready and save.
8. Batch other edits, then press **Publish site** once. Avoid editing the catalog during the snapshot step; concurrent changes cause a safe build failure and require a retry.
9. Check **Pages → Deployments** for success, then open that deployment's real URL. Hash deployment URLs are immutable: an old `https://<hash>.vidubuzz1.pages.dev` does not change when a new deployment finishes. Use the latest deployment or a verified current branch alias; do not guess an alias.

Archiving removes the model from the **new** static deployment after a successful build. It does not erase old immutable deployments, cached images or search-engine copies. R2 photo files are immutable shared assets and are not automatically deleted; do not delete a referenced file manually. Privacy/takedown removal from deployment history and assets requires separate account-side action.

New managed profiles correctly show zero linked videos for now: the current video catalog is fictional demo data, and this chunk does not invent real video associations from matching names. Explicit model/video ID relationships belong in the later video editor.

## SEO/export details

- Stable lowercase slugs are reserved atomically against model, channel and system paths. Names can change without moving the URL.
- Name/description text is escaped by React. JSON-LD escapes `<` to prevent script breakout. No custom HTML editor is allowed.
- Public real profiles receive canonical URLs, SEO title/description, Open Graph/Twitter image metadata, `ProfilePage`/`Person` and breadcrumb JSON-LD.
- Optional age/country are displayed only when supplied. No birthday, nationality, residence, country or age is inferred for structured data.
- `/sitemap.xml` is statically exported and lists published non-demo models with updated timestamps alongside existing public routes. `/robots.txt` excludes admin/API crawling; admin routes also keep their existing noindex headers. These are crawl hints, not access control.
- The public model directory uses real 24-item pagination instead of fake page numbers. Sitemap URLs expose every exported real profile for crawling, including those beyond page one.
- This is a bounded, small-catalog snapshot implementation (fewer than 10,000 published records), not million-record publishing. Larger catalogs need sharded snapshots/sitemaps, real video relations and a Pages file-count/build-limit plan before increasing this cap.

## Local development and verification

```bash
npm ci
npm run lint
npm test
npm run db:local
npm run build
npm run pages:dev
```

`npm run dev` runs the static frontend on `0.0.0.0`; use the Pages emulator for authenticated APIs. Copy `.dev.vars.example` to ignored `.dev.vars` for local Function settings; never reuse production credentials for QA.

For a real D1 snapshot in local Next development, supply the build variables privately in your shell / a secret manager and run `npm run models:sync` before starting Next. The build script does not automatically source `.dev.vars` (that file is for the Pages emulator). Do not commit `.generated/`, local SQLite, uploaded fixtures or `out/`.

Tests cover authentication/origin checks, migration readiness, optional fields/adult validation, R2 ownership/type/readiness, atomic slug reservations, stable URLs/revisions, list filtering/pagination, save/publish rate limits, deploy-hook safety and D1 snapshot filtering/pagination/fail-closed behavior. Local tests do not establish production CPU usage or live deploy-hook credentials.

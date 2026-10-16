# Models: easy drafts, D1 editing and static public pages

`/admin/models/` is part of the admin workspace. **Video management remains later.** Channels, Categories, Settings, information Pages and API & Connections are now available too. Start with the [workspace setup guide](workspace-setup.md) for migration `0004`, publishing, SEO and public pages.

Existing login credentials and R2 upload settings stay unchanged. No visitor login, Worker SSR, provider import or main-video upload is added.

## One-time model migration

If Models already work, skip this step. Otherwise, after the admin and R2 migrations, run the entire contents of `migrations/0003_models.sql` in **Cloudflare → D1 → the existing database bound as `DB` → Console**. Use the actual existing database, not a guessed example name.

It adds Models, shared URL reservations and indexes, preserving passwords/media. It imports the six existing **fictional demo profiles**, labels them, and does not invent an age or country. Demo detail pages remain noindex and absent from model sitemap entries. Editing a demo converts it to a managed record; add a verified R2 photo and explicitly confirm adult/permission status before selecting Public.

Then apply `0004_workspace.sql` using **Admin → API → Copy complete SQL** to enable the rest of the workspace and whole-site publishing. Models can still be edited with `0003` alone; the Publish site action requires the current workspace schema too.

## Daily flow: start small

1. Open **Models → Create Model**.
2. Enter the **name** and check the **adult/permission confirmation** after actually verifying both. These are the only required draft fields.
3. Tap **Save draft**. The URL is generated automatically, including a safe ASCII fallback for non-Latin-only names. No manual slug field is required. Saved URLs are immutable to avoid broken links.
4. When ready, add a verified photo and a short original introduction. Select **Public · next build**, then save.
5. Batch other edits, then **Publish site** once. Check **Pages → Deployments** and open the newly successful deployment URL. Saving or queuing a build does not mean the new profile is live.

**More details & SEO** stays collapsed by default. It contains optional country, verified adult age (integer 18–120), SEO title, meta description and image alt text. Unknown facts stay blank and absent publicly. Default SEO is generated from the saved name/introduction/site brand; search engines can rewrite it and no ranking is guaranteed.

Search, country/status filters, sorting and 12-row admin pagination are available in the Models list. Archive keeps the record but excludes it from the next successful public build. There is no destructive delete or slug-renaming UI.

### Photos

Choose an existing **verified image** from the R2 media library or use **Upload photo**, which uses the same direct signed upload and verification as Media. Preview/main videos cannot be profile photos. Only owned images that are ready and have verified dimensions/type can be selected. If verification fails after a successful PUT, retry verification rather than creating a duplicate upload. See [R2 setup](r2-setup.md) for limits and CORS.

Drafts do not require an image. Public managed profiles require a photo and introduction, in addition to adult confirmation. Do not publish an unverified age, identity or content permission.

## Publishing and public pages

See [private build-read setup and deploy-hook instructions](workspace-setup.md#enable-static-publishing-private-cloudflare-setup). This session uses branch **`arena/a87a8bb1-vidubuzz1`** and its Preview environment. Production is separate. Keep existing passwords, pepper/session secrets and R2 keys unchanged; never share them or the D1 token/hook URL in chat.

- Build: `npm run build`; output: `out`. The coordinated export logs **`Static site snapshot:`**, not the old model-only message.
- The build reads eligible public rows through private D1 SELECT access before Next runs. It validates URL ownership/photos and detects concurrent revisions; partial setup/errors fail closed. Only completely absent D1 build credentials enable demo fallback. An empty managed selection stays empty.
- Public model routes/directories are static HTML; no per-visitor Models API or D1 read is used. Public client card indexes omit biographies and SEO overrides. Drafts, archived rows, private ownership fields and secrets are not exported.
- Profiles have canonical URLs, branding, SEO metadata, image metadata, escaped `ProfilePage`/`Person` and breadcrumb JSON-LD. No birthday, nationality, residence, age or country is inferred.
- The public directory has real 24-item pagination. Eligible non-demo profiles appear in the sitemap and respect the site's indexing controls. Admin/API noindex is a crawl hint, not access control.
- New managed profiles show **zero linked videos**, even when their names match fictional demo actors. Explicit ID-based video associations belong in the later Video editor.
- Archiving affects the next deployment, not immutable old deployment URLs, search caches or shared R2 files. Takedown/removal of old copies/assets needs separate account-side action.

The static architecture avoids a public catalog Function per page view, but it does not promise unlimited free R2 usage or establish production Function CPU time. The current bounded exporter is not a million-record publishing system.

## Local verification

Follow the [workspace local verification](workspace-setup.md#local-verification) instructions. Use synthetic local credentials, not real production secrets. Unit/API/build tests and browser QA are evidence of tested code paths, not a live Cloudflare credential, deployment-hook or CPU guarantee.

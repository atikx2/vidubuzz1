# Vidubuzz

Static-first Next.js 15 App Router site with TypeScript, Tailwind CSS v4, shadcn/ui-style primitives and Framer Motion. Public content exports to `out/`; API-only Cloudflare Pages Functions handle the private admin workspace, D1 metadata and existing anonymous analytics. No Worker SSR or visitor accounts.

## Run locally

```bash
npm ci
npm run dev
```

For the authenticated workspace, configure synthetic local `.dev.vars` values privately, then:

```bash
npm run db:local
npm run build
npm run pages:dev
```

Next/Pages bind to `0.0.0.0`. Existing deployment build command: **`npm run build`**, output: **`out`**. Build-read configuration is separate from local Function `.dev.vars`.

## Admin workspace

Desktop sidebar and a scrollbar-free, horizontally swipeable mobile menu, with SVG icons and text:

- **Models:** easy name + adult-confirmation drafts, automatic immutable URLs, optional advanced fields/SEO, verified R2 photos, search/filter/sort/pagination.
- **Channels / Categories:** real D1 Create/Edit, stable URLs, draft/public/archive, search/filter/sort/pagination. Placeholder taxonomy only; no scraping.
- **Settings:** identity, canonical origin, public contact addresses, homepage SEO, Google/Bing verification tokens, indexing and validated public colors.
- **Pages:** reviewed About, Contact, Privacy, Terms and Content removal. Starter copies stay private drafts until replaced and explicitly reviewed.
- **API & Connections:** authenticated configuration status, phone-friendly migration SQL copy/show/download and endpoint documentation. No public key issuance/external integration.
- **Media, Analytics, Profile:** existing R2 photo/short-preview library, real collected analytics and private account controls.
- **Videos:** explicitly deferred; no video editor/import/provider integration in this change.

Start with [workspace setup](docs/workspace-setup.md), particularly migration **`0004_workspace.sql`** for an existing installation. Models require `0003_models.sql`; model editing remains available before whole-workspace publishing is configured. Never reset an existing admin account or rotate its secrets as a migration step.

More guides:

- [Initial admin/D1 setup](docs/admin-setup.md)
- [R2 binding, direct uploads and CORS](docs/r2-setup.md)
- [Models and easy draft workflow](docs/models-setup.md)

## Save versus publish

Admin saves update D1. Public model/channel/category/information routes, search cards, metadata, footer and sitemap update after a **successful static build** using private D1 read access. Publish site queues one correct-branch Pages deploy hook; queued is not deployed. Public visitors do not make a catalog API/D1 query per page view.

Without D1 build credentials the export uses the existing fictional demo fallback. Partial configuration/errors fail closed; an intentionally empty managed catalog stays empty. Only published eligible records and reviewed public information pages are exported. Private drafts, raw ownership data and secrets do not ship in public snapshots; client card indexes omit biographies/policies.

R2 handles photos/thumbnails/short previews through direct browser uploads and native public delivery, not a Worker file proxy. B2 is not used. Main video stays at the provider stream URL; no duplication into R2. Production credentials, upload verification, deployment success and CPU limits are not inferred from readiness indicators or local tests.

## Checks

```bash
npm run lint
npm test
npm run build
```

Generated `.generated/`, `out/`, local SQLite and QA fixtures are ignored and must not be committed. Private tokens, upload keys, session secrets, passwords and deploy-hook URLs belong in encrypted Cloudflare settings, not Git, chat or `NEXT_PUBLIC_*`.

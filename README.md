# Vidubuzz homepage

Static-first Next.js 15 homepage prototype using the App Router, TypeScript, Tailwind CSS v4, shadcn/ui-style primitives, and Framer Motion.

## Run locally

```bash
npm install
npm run dev
```

## Static export

```bash
npm run build
```

The static site is exported to `out/`.

## Basic admin panel

Routes: `/admin/login/`, `/admin/`, and `/admin/profile/`. The dashboard uses API-only Cloudflare Pages Functions + D1; the public site remains statically exported (no Worker SSR). Menu items have SVG icons and text, a desktop sidebar, and a horizontally swipeable menu below the mobile header.

Follow [the admin setup guide](docs/admin-setup.md) to bind D1, apply the migration, set encrypted admin secrets, and run the full local Pages preview. Login is intentionally unavailable until those bindings/secrets exist; no password is embedded in the client.

### R2 media uploads

`/admin/media/` contains the admin-only image/short-preview uploader and verified media library. Files upload directly from the browser to a signed R2 S3 URL; D1 stores metadata and public asset URLs. Public delivery uses an R2 custom domain, not a Worker file proxy. B2 is not used, and main video files remain provider URLs.

Follow [R2 setup](docs/r2-setup.md) to create/bind the bucket, apply `0002_r2_media.sql`, configure S3 secrets and CORS, and cut over the old B2 asset domain safely. Live uploads remain disabled until that setup exists. Channel/video editors are still a separate next chunk.

### Model management

`/admin/models/` lists all D1 model profiles with thumbnail cards, search, country/status filters, pagination, Create/Edit, optional country/age, adult confirmation, R2 photo selection/direct upload and SEO previews. Saved slugs are stable; draft/public-next-build/archived status is explicit.

Follow [model setup](docs/models-setup.md) to apply `0003_models.sql`, configure private D1 build-read access, and optionally enable a branch-specific Pages deploy hook. Saves update D1; public model pages remain a static build-time snapshot, not Worker SSR or per-visitor model API calls. No public user registration is added.

```bash
npm run lint
npm test
npm run build
```

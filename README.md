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

```bash
npm run lint
npm test
npm run build
```

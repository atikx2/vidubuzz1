# Basic admin setup — Cloudflare Pages + D1

## Routes and scope

- `/admin/login/` — admin sign-in (default email: `atikhasan315377@gmail.com`).
- `/admin/` — dashboard, live visitor count, tracked video/page views, seven-day chart, top watched videos, and catalog summary.
- `/admin/profile/` — account details and password change.

The public site **still uses Next.js static export**, `trailingSlash: true`, and `out/`. Pages Functions handle **only `/api/*`**, not Next.js SSR. Admin HTML/JS is a public shell; all private data and account operations require server-side authentication. Admin routes have noindex metadata and no-store headers.

This is a basic dashboard, not a content editor. The Videos/Models/Channels/Categories menu entries jump to the read-only catalog summary. Catalog totals come from `lib/demo-content.ts` (24 videos, 6 models, 10 channels, 10 categories); those are not the large placeholder per-profile totals. Traffic is read from D1, never simulated from the demo view counters.

## 1. Create and bind a D1 database

In Cloudflare, create a D1 database such as `vidubuzz-admin`. Apply `migrations/0001_admin_analytics.sql` using the D1 console. Alternatively, if your authenticated Wrangler configuration already contains the **real** D1 database ID, run:

```bash
npx wrangler d1 execute vidubuzz-admin --remote --file migrations/0001_admin_analytics.sql
```

In the existing Pages project's **Settings → Bindings**, add a **D1 database binding named `DB`** and select that database. Set the binding for the environment being tested: **Preview and Production are separate settings**. A separate preview database is recommended so preview tests do not change production credentials/analytics. Apply the migration to each database you use.

No actual database ID is committed. `wrangler.local.jsonc` is intentionally local-only; do not use it for remote deployment.

## 2. Set environment variables and encrypted secrets

Configure these in the same Pages project's Preview/Production settings:

| Name | Type | Value |
| --- | --- | --- |
| `ADMIN_EMAIL` | Environment variable | `atikhasan315377@gmail.com` (optional; already the server default) |
| `ADMIN_INITIAL_PASSWORD` | Encrypted secret | The initial password requested for this account |
| `ADMIN_PASSWORD_PEPPER` | Encrypted secret | A cryptographically random secret, at least 32 characters |
| `ADMIN_SESSION_SECRET` | Encrypted secret | A **different** random secret, at least 32 characters |

Generate each random secret independently in a trusted terminal:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Never put secrets in `NEXT_PUBLIC_*`, source files, Git, screenshots, or chat. No initial password is embedded in the frontend or repository.

On the first successful login the server creates the account with a salted PBKDF2-SHA256 password hash and a server-side pepper. Then change the initial password from **Profile**. Replacement passwords require 12–256 characters. Remove `ADMIN_INITIAL_PASSWORD` after initialization. Changing that secret later **does not reset an existing account**.

Keep the pepper stable: changing it invalidates existing password verification. Changing the session secret signs out all sessions. Store both safely.

## 3. Deploy the existing Pages project

- Node.js version: 22.17 or newer (`NODE_VERSION=22.22.3` is tested).
- Build command: `npm run build`
- Build output directory: `out`
- Leave `functions/` at the repository root; Pages compiles its API routes.
- Keep `public/_routes.json` and `public/_headers`; Next copies them to `out/`.
- Redeploy after adding the D1 binding or secrets.

An uploaded `out/` folder alone, on a host that does not deploy `functions/`, is not enough for admin login. Use the Pages Git integration or Wrangler Pages deployment from the repository root. A Next.js dev server alone also does not run Pages Functions.

There is no fake-login fallback. Missing bindings return a setup error, not a dashboard full of invented metrics.

## Local development

```bash
npm ci
cp .dev.vars.example .dev.vars
# Fill .dev.vars locally. It is ignored by Git.
npm run db:local
npm run build
npm run pages:dev
```

Open `http://localhost:8788/admin/login/` (or the provided HTTPS live-preview URL in a **new browser tab**). Secure SameSite cookies may be blocked inside a cross-site preview iframe. The emulator serves both the static export and real API functions, with a local SQLite-backed D1 database. Local state lives in ignored `.wrangler/`; local secrets live in ignored `.dev.vars`.

For frontend-only editing, `npm run dev` is still available. Use the Pages emulator to test authentication, metrics, and password changes end to end.

## Metric definitions

- **Realtime visitors:** anonymous browser sessions with a page visit/heartbeat in the last five minutes. Visible public pages send a heartbeat every 60 seconds; the visible dashboard refreshes every 30 seconds. This is not a WebSocket concurrent-user count.
- **Total views:** actual player `playing` events recorded since setup, deduplicated per anonymous session/video for a rolling 30-minute window. Metadata preloading, failed playback, and pause/resume do not inflate the count.
- **Page views:** visits to known public routes. Admin routes, query strings and fragments are excluded.
- **Views today/chart:** UTC day boundaries. The chart includes the last seven calendar days, with real zero values when no plays are recorded.
- **Catalog totals:** current static demo records, not D1-managed content yet.

Only a hashed anonymous session ID, page path, video ID and timestamp are stored for analytics. No names, raw IP addresses, email addresses or provider stream URLs are recorded by analytics. A session ID is tab-scoped; counts are not guaranteed unique people. Browser blocking/network failures can undercount; public event requests can be spoofed. Do not use these counters for billing.

## Security and operations

- Login/password POSTs require a matching Origin; cookies are signed, Secure, HttpOnly, SameSite=Strict, scoped to `/api/admin`, and expire in eight hours.
- D1 stores only hashes of session IDs. Logout revokes the session in D1; password changes invalidate all previous sessions, while issuing a fresh cookie for the current device.
- Login is rate-limited to 10 attempts per IP per 15 minutes; password changes to five. Rate keys are HMAC-hashed, not raw IP addresses. Analytics has a per-session request limit and accepts only known public paths/videos.
- For production, additionally configure Cloudflare edge rate limits/bot protection for `/api/admin/login` and `/api/analytics/track`. Use a strong unique replacement password. MFA is not part of this basic version.
- The event log is intentionally simple for this first version and grows with traffic. Add an aggregation/retention job before high-volume deployment. Deleting event history also changes the current lifetime view totals. Old expired visitor/rate-limit rows can be pruned without changing lifetime view totals.
- Back up D1 before changing migrations. Do not expose raw database contents publicly.

## Validation

```bash
npm run lint
npm test
npm run build
npm audit --audit-level=high
```

API tests use isolated in-memory SQLite and test-only credentials. They cover bootstrap, salted hashing, authenticated/unauthenticated access, CSRF, forged/expired sessions, logout revocation, password persistence/session invalidation, rate limits, request validation, event deduplication, and real chart/count queries.

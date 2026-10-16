# R2 media storage — thumbnails, photos and short previews

B2 is no longer used. This chunk adds `/admin/media/`, an admin-only R2 uploader and a verified media library. The public website remains a Next.js static export. **Main videos are provider URLs and are never uploaded by this library.** Models, Channels and Categories can now select verified images in the [admin workspace](workspace-setup.md). Video management remains later; uploading an asset alone does not create or publish a content page.

## Upload and delivery flow

1. The authenticated admin selects a JPEG/PNG/WebP/AVIF image or a prepared MP4/WebM preview.
2. A Pages Function validates metadata, creates a pending D1 intent, and signs one R2 S3 PUT URL for ten minutes.
3. The browser sends the File directly to the R2 S3 endpoint. It does not send the file body through a Worker upload proxy.
4. The completion API reads R2 object metadata and only the first 512 bytes to check the media signature. It verifies size, signed metadata and owner before marking the asset ready in D1.
5. Public reads go directly to the R2 custom domain/CDN. There is **no public file-serving Worker route** in this repository.

The PUT signature binds the exact Content-Length, Content-Type, Cache-Control and upload metadata. A signed `If-None-Match: *` prevents overwriting an existing object. The browser supplies Host and Content-Length automatically; never attempt to set those forbidden browser headers manually. URLs are bearer capabilities: never share or log a presigned upload URL.

## 1. Create the actual R2 bucket

In the existing Cloudflare account: **Storage & databases → R2 → Overview → Create bucket**.

- Suggested name: `vidubuzz-assets` (use your actual bucket name in every setting below).
- Storage class: **Standard**. The R2 included free tier does not apply to Infrequent Access.
- Do not upload main video files. Upload only public website images and prepared preview clips.

R2 activation alone does not create a bucket, a public domain, S3 credentials or a Pages binding. R2 billing/free quotas still apply; this code is not an unlimited-storage promise.

## 2. Cut over the asset domain from B2 to R2

The domain `vidubuzz.top` is already active on Cloudflare. Use the **same Cloudflare account** as the R2 bucket.

Only at cutover:

1. In `vidubuzz.top` Rules, disable the old **B2 image assets URL Rewrite Rule**. Its `/file/vidubuzz-assets` prefix is for B2 and will break R2 object paths.
2. Keep the mistaken B2 Redirect Rule disabled. Do not disable unrelated rules or touch the root website's redirects.
3. Remove/disable the old asset-only **B2 assets HTTPS Configuration Rule**; R2's domain integration manages the R2 connection.
4. In DNS, remove only the old `assets` CNAME pointing at `f005.backblazeb2.com` if it conflicts with domain connection. **Do not change `@`, `www`, MX/TXT, or the existing `209.38.41.198` root record.**
5. In **R2 → your bucket → Settings → Custom Domains → Add/Connect domain**, enter `assets.vidubuzz.top` and confirm Cloudflare's managed DNS record. Do not manually CNAME to the private S3 endpoint or to an `r2.dev` URL.
6. Wait for the custom domain to be active. Upload a harmless test image from the R2 dashboard and open `https://assets.vidubuzz.top/<actual-object-key>`.

A public custom domain exposes the bucket's website assets to anyone with the URL. Keep private documents/credentials in a different non-public bucket. A bucket root URL is not a gallery/listing. Public custom-domain URLs do not need the expired B2 authorization token. `r2.dev` is only a rate-limited development access path, not the production CDN.

## 3. Add the R2 binding to Pages

**Workers & Pages → `vidubuzz1` Pages project → Settings → Bindings → Add → R2 bucket**:

- Variable / binding name: **`ASSETS_BUCKET`**
- R2 bucket: the bucket you just created

Use the same environment as the working admin's D1 `DB` and authentication secrets. Preview and Production are separate settings. This binding is used only by admin completion/verification APIs, not public image/video delivery.

## 4. Create limited S3 upload credentials

In R2's **Manage R2 API Tokens** area, create an R2 S3 API token with **Object Read & Write** restricted to this bucket. Do not use an account-wide master key. Keep the generated **Access Key ID** and **Secret Access Key** private; copy them directly into encrypted Pages secrets, never into chat/Git/frontend code.

Configure in the same Pages environment:

| Name | Type | Value |
| --- | --- | --- |
| `R2_ACCOUNT_ID` | Text variable | Actual 32-character Cloudflare Account ID shown in R2/account details |
| `R2_BUCKET_NAME` | Text variable | Actual bucket name, e.g. `vidubuzz-assets` |
| `R2_PUBLIC_BASE_URL` | Text variable | `https://assets.vidubuzz.top` (HTTPS origin only; no `/file/...` prefix or query) |
| `R2_ACCESS_KEY_ID` | Encrypted secret | The generated **S3 Access Key ID** |
| `R2_SECRET_ACCESS_KEY` | Encrypted secret | The generated **S3 Secret Access Key** |

A Cloudflare bearer management API token is **not** interchangeable with the S3 credentials. The S3 upload endpoint is derived from the Account ID: `https://<actual-account-id>.r2.cloudflarestorage.com/<bucket>/<object-key>`. Public delivery uses the custom domain instead.

## 5. Apply the additional D1 migration

The existing admin migration stays unchanged. Apply **`migrations/0002_r2_media.sql`** to the same D1 database bound as `DB`, using its Console (or authenticated Wrangler with the real database configuration).

This creates `media_assets` and its indexes. It stores upload metadata/status, **not file bytes**, and does not overwrite your admin account/password. Pending/rejected intents are never shown in the public-URL library. Do not delete the original admin tables.

## 6. Configure browser-upload CORS

In **R2 → bucket → Settings → CORS policy**, use `r2-cors.example.json` as a starting point.

The exact HTTPS origin used for the admin upload page must be allowed. For preview testing, add the **current preview origin or stable branch-alias origin** shown in Pages Deployment details, with no path or trailing slash. Every new hash-based deployment is a different origin; using a stable alias avoids repeatedly editing CORS. Do not copy a placeholder preview URL.

Required policy:

- AllowedMethods: `PUT`, `GET`, `HEAD`
- AllowedHeaders: `Content-Type`, `Cache-Control`, `If-None-Match`, `x-amz-meta-asset-id`, `x-amz-meta-purpose`
- ExposeHeaders: `ETag`

CORS is not the authentication layer. Only an authenticated same-origin admin API request can issue a short-lived upload capability, and a valid signature is still required for PUT. Do not send the admin cookie to the S3 origin.

## 7. Redeploy and test one upload

After all bindings/secrets/migrations/CORS are set, redeploy the branch and open the latest `/admin/media/` in a new top-level browser tab. Do not reuse an immutable old deployment URL with missing bindings.

1. Upload a small image. The progress should say **Uploading directly to R2**.
2. The API verifies its metadata and file header; then it appears in the gallery.
3. Copy/open the **public asset URL**. It must resolve on the R2 custom domain.
4. Upload a prepared short clip and check playback, seek and content type on the R2 domain.

An upload completing does not prove the public domain/cache configuration is correct. If signing works but PUT fails, check the exact admin CORS origin, permitted headers, S3 token's bucket scope and matching bucket name/binding. If bytes arrived but completion failed due to a network interruption, use **Retry verification**; do not upload the same key again.

## Limits and operational notes

- Images: JPEG/PNG/WebP/AVIF, up to **5 MiB**, up to **32 megapixels** and at most 8192 pixels per dimension.
- Preview clips: MP4/WebM, up to **25 MiB**, up to **60 seconds**, at most 8192 pixels per dimension. Long/full main videos are rejected in the browser and never intentionally uploaded.
- File sizes, media type, owner and signed metadata are checked server-side. File-header checks are shallow signatures, not malware scanning or full decoding. Clip duration/dimensions are read in the authenticated admin's browser; the server does **not** transcode or independently parse full video duration. The admin is a trusted uploader.
- Object keys are server-generated, unique and versioned by UUID. No user-chosen existing key is signed. Objects receive an immutable cache policy; use a new upload/URL when replacing an image, not an in-place overwrite.
- Signing is limited to **20 upload intents per admin per ten minutes**. Verification is limited separately. Incomplete/aborted direct uploads can leave unverified objects/intents; review these before high-volume operation. This first chunk has no media delete/garbage-collection job or reference-management UI.
- Public media does not invoke a custom Worker file proxy. Admin session checks, signing, verification and D1 writes still use Functions CPU/operations; existing anonymous visitor analytics remain separate. No production 10 ms CPU guarantee is made without measuring Cloudflare invocations.
- Prepared preview delivery uses R2, not the generic B2 CDN workaround. R2/Cloudflare content policies, storage and Class A/B operation quotas/billing still apply. Do not assume unlimited free storage or transformations. No automatic image processing/video-preview generation is part of this chunk.
- Asset uploads do **not** automatically create or publish public records. Select a verified image in the Models/Channels/Categories editor, save the record, then complete a successful static build; see [workspace setup](workspace-setup.md). Video management remains deferred.

## Local validation

```bash
npm ci
cp .dev.vars.example .dev.vars
# Set test-only values locally; never use production credentials in a fixture.
npm run db:local
npm run build
npm run pages:dev
npm test
```

The local Pages emulator has a native local R2 binding for verification. Real direct S3 upload requires configured live S3 credentials and CORS; tests use isolated R2 fixtures and independently validate SigV4. Local tests do not claim that your live bucket/domain was provisioned.

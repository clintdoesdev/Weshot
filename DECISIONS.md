# Decisions

Choices made where `WESHOT_PRODUCT_SPEC.md` and `WESHOT_UI_SPEC.md` are silent. Newest decisions are appended per phase.

## Phase 1 — scaffold

- **Package format.** `packages/shared` and `packages/frame` ship TypeScript source (no build step). The web app consumes them via `transpilePackages`; the worker is bundled with `tsup`.
- **Zod 3.25** (stable API) and **Prisma 6** (classic `schema.prisma` + `prisma-client-js`). The Prisma schema lives at the repo root (`prisma/`) as the spec lays out, and the root `package.json` points Prisma at it.
- **Playwright 1.56.1**, pinned to match the Chromium build preinstalled in the dev container and to the worker Docker base image `mcr.microsoft.com/playwright:v1.56.1-jammy`.
- **Tailwind CSS 3.4** with every token from UI spec §1 defined as CSS variables and mirrored in `tailwind.config.ts` theme extensions.
- **Local storage driver.** When `R2_ACCOUNT_ID` is empty, web and worker store files on disk under `STORAGE_DIR` (default `<repo>/.data/storage`) and the web app serves them at `/api/files/*`, with HMAC-signed upload URLs. This keeps local dev free of a Cloudflare account. Two extra dev-only variables were added to `.env.example`: `STORAGE_DIR` and `CRON_SECRET` (also used to authorise the expiry cron in production).
- **Turnstile test keys** are the defaults in `.env.example` so local captures work; production must replace them.
- **Built-in presets.** The spec names them but not their values. Launch post = Honey, macOS dark glass, URL pill, color lights, radius 14, padding 52, soft shadow, X post canvas (this matches the values shown in the UI spec tiles). Portfolio = Midnight glow, Safari light glass, radius 16, padding 88, deep shadow, grain 6 %, Dribbble canvas. Minimal = Paper, macOS light glass, empty title bar, mono lights, radius 12, padding 40, soft shadow, Auto canvas.
- **Default capture settings.** Desktop 1440 × 900, 2x, viewport only, automatic color scheme, no delay, hide banners on. Default record: scroll-through, 12 s, ease in and out, pause at headings on, cursor on, 30 fps, MP4.
- **Window scale range** 0.5–2 and **offset range** ±2000 px (canvas px at 1x). The spec gives no bounds.
- **URL normalisation** adds `https://`, rejects anything but http(s), rejects credentials in the URL, and requires a dotted host name, IP literal or `localhost`. Private hosts are rejected only by the worker after DNS resolution so the check cannot be bypassed client-side.

## Phase 2 — frame compositor

- **`renderFrame` takes a fifth, optional `resources` argument** (`backgroundImage`, `url`, `title`, `fontFamily`, `sourceSize`). The spec signature has four arguments, but the settings model stores a background image only as a `src` string and has no URL or page title, and a pure synchronous function cannot load images. Callers decode the background image once and pass it in.
- **Window units.** UI spec §2.11 sizes (42 px title bar, 12 px lights, 12 px URL text, shadows, corner radius) are defined at the preview stage, where the window is at most 640 px wide. The compositor scales all of them by `unit = windowWidth / 640` (clamped 0.5–4) so a 1600 × 900 export looks exactly like the preview, only larger. Padding and window offset stay in canvas px.
- **Safari style** uses a 52-unit title bar with traffic lights, back/forward chevrons and a centred address field (lock glyph for https). **None** has no title bar and no border, only the rounded page with its shadow.
- **Auto canvas** sizes the content to the source width, capped at 1600 px, plus title bar and padding. Use a 2x or 4x export to keep the full resolution of retina captures.
- **Tall sources** (height more than 2 × width, i.e. full-page captures) are cropped from the top in fixed-size canvases; in Auto they are shown whole.
- **Grain** is monochrome noise from an integer hash of each device pixel, amplitude `grain% × 1.28` levels. It is deterministic, so preview, export and snapshots always agree, and it skips transparent pixels.
- **Blur** blurs the background layer only (the window is never blurred); the paint area is grown so edges do not fade.
- **Video template**: with `source = null` the content area is punched out with `destination-out` (rounded bottom corners), so page frames composited underneath show through.
- **Snapshot tests** run in Node with `@napi-rs/canvas` and a bundled Inter font (OFL) for stable text. Comparison uses pixelmatch with a 0.2 % pixel tolerance to absorb anti-aliasing differences between Skia builds. Update with `UPDATE_SNAPSHOTS=1 pnpm --filter @weshot/frame test`.
- **Demo page.** The first-visit preview shows a fake landing page ("Queuely") painted by `drawDemoPage` in `packages/frame`, using `system-ui`.

## Phase 3 — landing page and editor (image mode)

- **Pixel parity without `clip()`.** Chromium anti-aliases `ctx.clip()` on fractional coordinates differently on a main-thread canvas than on a worker `OffscreenCanvas`. `renderFrame` therefore draws the window body into a scratch layer and masks it with a filled path (`destination-in`), and both canvases use `willReadFrequently` (CPU raster). The e2e suite asserts **zero** differing pixels between the worker export and a main-thread render at 1x, 2x and 4x, including grain, blur and title bar text.
- **Preview stage.** The stage is a dark well (min height 520 px desktop, 290 px mobile) with the rendered canvas centred inside it. The UI spec says the stage background is the current background, but the canvas already paints the background, and filling the letterbox area with a CSS copy of it leaves a visible seam for gradients, so the well stays neutral.
- **Zoom** ranges from half of Fit to 200 % of output pixels. "Fit" resets it. Pinch to zoom on mobile.
- **Export scale** (1x, 2x, 4x) has a secondary segmented control in the Export tile and in the mobile download sheet. The scope requires these scales but the tile layout does not show a control for them. Scale drops automatically when a canvas would exceed browser limits (16,384 px per side, 268 MP, or 16.7 MP on iOS), and a toast says so.
- **Capture tile extras.** Color scheme (Auto, Light, Dark) and Delay (0–10 s) sit in the Capture tile under the four controls the UI spec lists, because they are in scope and need a home. Traffic lights (Color, Mono, Hidden) sit in the Window tile. Window scale and Offset X/Y sit in the Layout tile.
- **Capture controls with the demo page.** These stay live on first visit (the spec says "tiles are live") and are disabled only for pasted images.
- **Narrow tiles.** At the specified 2-column, 460 px tile column, segmented controls sit under their label instead of beside it.
- **User presets.** "Save current" turns into an inline name field. A "Preset options" menu holds Export presets, Import presets and Delete {name}. Uploaded background images are stored in presets as a JPEG data URL, at most 2400 px.
- **Copy image** always copies a PNG, the only type every clipboard accepts.
- **Images over 8,000 px** on the longest side are scaled down rather than rejected. The spec only has error copy for files over 25 MB. Non-image files show "That file isn't an image WeShot can read."
- **Small copy the specs leave open.** Toasts: "Couldn't copy. Use Download instead.", "Couldn't export the image. Try a smaller size.", "{n} presets imported", "That file isn't a WeShot presets file.". The body text of the three step cards and of the recordings section. "Skip to the editor" link. All sentence case, no emoji.
- **Mobile editor** is a full-screen layer opened with `history.pushState('#editor')`, so the Back button closes it. The logo in its header also goes back. `/#editor` on a phone opens it directly.
- **Gallery thumbnails, the recordings card, the mobile demo card and the OG image** are static WebP/PNG files rendered by `apps/web/scripts/render-static.ts` with the same `renderFrame`, which keeps the landing page light. Re-run with `pnpm --filter @weshot/web render:static`. The "desktop and phone" card overlays a phone-sized window. Clicking it loads the Lemon preset.
- **Shortcuts dialog** opens with Shift + / (the `?` key). It lists the shortcuts from UI spec §6.
- **Test hooks.** `window.__weshot` is installed only when `NEXT_PUBLIC_E2E=1`.

## Phase 4 — URL capture

- **`packages/server`** (Node only) holds what the web routes and the worker share: storage (R2 or local), Redis, BullMQ queues, job events, rate limits and IP hashing.
- **BullMQ 5.81** with ioredis 5. BullMQ 6 had just come out; 5.x is the stable, documented line.
- **SSRF design (product spec §4.6).** Every job gets its own Chromium behind its own in-process forward proxy. Chromium is launched with `--proxy-server` and `<-loopback>`, so even `localhost` goes through the proxy. QUIC, DNS prefetch and non-proxied WebRTC UDP are disabled. For each request or CONNECT tunnel, the proxy resolves the host once, rejects it unless *every* address is public, and connects to the address it checked. That covers redirects (each hop is a new proxy request, max 5), subresources, websockets and DNS rebinding (a second lookup cannot change where the socket goes). The URL is also checked before the job starts (scheme, credentials, port, DNS). Blocked ranges: everything in the spec plus 0/8, 100.64/10, multicast and reserved, fe80::/10, IPv4-mapped, NAT64 and 6to4 forms. Non-web ports on public hosts (Redis, Postgres, Docker, Kubernetes and others) are refused too.
- **More than 5 redirects** is reported as `HTTP_4XX` with status 310 ("The site returned an error (310).") because §6 has no closer message.
- **50 MB response cap.** Once the proxy has relayed 50 MB for a job, further subresource requests are aborted and the capture continues with what has loaded, instead of failing.
- **Ad, tracker and cookie-banner blocking** uses Ghostery's engine (`@ghostery/adblocker-playwright`). It loads the "ads and tracking" lists, or the "full" lists including cookie notices when hideBanners is on, and caches them on disk. Lists that cannot be fetched mean no blocking, not a failed capture. Cosmetic hiding is a curated CSS list plus a click on common consent "accept" buttons.
- **Bot walls** (BOT_CHECK): Cloudflare `cf-mitigated`, challenge titles and markup, captcha iframes, or 403/429/503 from a known bot-protection server.
- **Two error codes the spec does not list:** `BLOCKED_SITE` ("WeShot can't open this site.", offers Paste a screenshot instead) for the domain blocklist, and `BOT_PROTECTION` for a failed Turnstile check. The concurrent-job limit reuses `RATE_LIMIT` with 1 minute.
- **Domain blocklist** is a seed list in `apps/web/src/lib/server/blocklist-data.ts`, plus `BLOCKLIST_EXTRA` (comma-separated, no redeploy needed). `DEPLOY.md` explains how to refresh it from public feeds.
- **Job events** go out on Redis pub/sub for live updates, and the latest event of each type is also kept in a hash (1 h TTL). An SSE stream that connects late or reconnects replays that state, with the terminal status last. The stream closes after `done`/`failed`. `maxDuration` is 300 s on Vercel.
- **Turnstile** loads lazily on the first capture in `interaction-only` mode, so it stays invisible unless Cloudflare needs an interaction. The browser reads the site key from `TURNSTILE_SITE_KEY`, exposed as `NEXT_PUBLIC_TURNSTILE_SITE_KEY` by `next.config.ts`. Without a secret key, verification passes in development and fails in production.
- **Mocked worker for e2e** (`E2E_MOCK_WORKER=1`): an in-memory job runner inside the web app. Test hosts choose the outcome (`timeout.test`, `bot.test`, `error500.test`, `private.test`), and fixtures are served from `/e2e/*` only in that mode.
- **Full-page captures taller than 16,000 px** are cut, and a toast says "This page is taller than 16,000 px, so the capture stops there."
- **Mobile viewports** (width ≤ 600) capture with `isMobile`, touch and a mobile Chrome user agent; others use a desktop Chrome user agent that matches the bundled Chromium version.

## Phase 5 — recording

- **Record layout.** The editor switches to the UI spec §3.2 layout (preview panel plus a 420 px aside with a 3×2 tab grid) when the Record tab is selected or a recording is running. The full options (type, sections, length, easing, pauses, cursor, frame rate, format) need a home before Record is pressed, and the six-tile Record tile only has room for length and the button. Other tabs work inside the aside while recording ("You can keep styling while it records."). Choosing another tab when idle returns to the six tiles. On mobile the Record tab shows the same panel.
- **Section tour.** Users list CSS selectors, one per line. Left empty, the tour visits the page's own `section`, `main > div` and `h2` blocks (up to 8 stops).
- **Frames** are captured one at a time (scroll, then CDP `Page.captureScreenshot` as JPEG) on a virtual timeline, so motion is perfectly smooth whatever the capture speed. Device scale is just enough for the content area (1x or 2x).
- **Cursor** is a DOM overlay injected into the page (black arrow with a white outline and a yellow ripple ring), so it is part of the page frames and is masked with them.
- **Compositing.** The template is opaque everywhere except the content hole with its rounded bottom corners, so laying page frames under the template *is* the rounded-corner alpha mask. A transparent background records on black, because MP4, WebM and GIF here have no alpha.
- **Video size** is the canvas setting scaled so the longest side is at most 1920 px, rounded to even dimensions for yuv420p. GIF is 800 px wide at 15 fps (product spec §4.7); the GIF format caps length at 15 s and locks the frame rate.
- **Stop** (`POST /api/jobs/:id/stop`, not in the spec's API table) sets a Redis flag. The worker stops capturing and encodes what it has.
- **WebM** uses `libvpx-vp9 -crf 32 -b:v 0` as specified, plus `-row-mt 1 -deadline good -cpu-used 5` for reasonable encode times.
- **Uploads** (`/api/uploads`) are limited to 60 per hour per hashed IP. Templates must be PNG and at most 8 MB, checked again when `/api/record` is called. Templates are deleted once the recording finishes.
- **Status pill labels**: "Loading page", "Recording" and "Encoding", with time in Geist Mono ("7.2 s / 12 s").

## Phase 6 — share links

- **What is shared.** The current image export (selected format and scale), or the recorded video when a video format is selected and a video is ready. Files go straight from the browser to storage through a presigned PUT. `/api/share` then checks the object exists and is at most 50 MB, and deletes it if it is larger.
- **Ids and tokens.** Ids are 10 characters from `[0-9A-Za-z]` via `crypto.randomBytes` with rejection sampling (no nanoid dependency). Delete tokens are 24 random bytes in base64url. Only `sha256(token)` is stored, and it is compared in constant time. A wrong token and a missing share both return 404, so ids cannot be probed.
- **Share limits**: 20 per hour, 100 per day per hashed IP.
- **Viewer page** `/s/[id]`: the framed image (or an auto-playing, muted, looping video), "Expires {date}", "Report this page" (mailto `abuse@weshot.app`), and "Delete" only in the browser that holds the token. Also a "Frame your own" pill linking home. `noindex, nofollow`, and robots.txt disallows `/s/`. Expired or deleted links show "This link has expired".
- **Open Graph for videos.** MP4 and WebM shares carry `og:video` tags with the site's OG image as the preview picture, since the data model has no poster field. GIF and image shares use the file itself as `og:image`.
- **Expiry cron** is `GET /api/cron/expire`, scheduled daily at 03:17 UTC in `apps/web/vercel.json`. It requires `Authorization: Bearer $CRON_SECRET`, which Vercel Cron sends automatically. It deletes expired shares and their files, and Job rows older than 30 days. R2 lifecycle rules back this up (see DEPLOY.md).
- **Repo-root `.env`.** `next.config.ts` loads it via `@next/env`, so web, worker and Prisma share one file. `.env.example` uses `http://localhost:3000` for `NEXT_PUBLIC_SITE_URL` locally; production uses `https://weshot.app`.
- **Copy the specs leave open**: "Creating your link", "Link copied", "Share link deleted", "That file is over 50 MB. Try a smaller size.", "This link has expired", "Share links last 30 days, or until the person who made them deletes them."

## Phase 7 — hardening and launch

- **Code splitting for the landing page.** The desktop editor mounts only at ≥ 768 px. The editor, mobile editor, download sheet and dialogs are separate chunks loaded when shown. Landing components reach editor code through `lib/lazy-actions.ts`, and `@weshot/shared` has subpath exports (`/url`, `/errors`, `/presets`, `/constants`, `/backgrounds`) so the landing page never ships zod. First-load JS for `/` dropped from 155 kB to 119 kB.
- **Sentry** (`@sentry/nextjs` 11, `@sentry/node` 11) is imported dynamically only when `SENTRY_DSN` is set; the browser DSN is exposed from `SENTRY_DSN` by `next.config.ts`. Source map upload is left optional (see DEPLOY.md).
- **PostHog** runs cookieless: memory persistence, no autocapture, no session recording, `person_profiles: 'never'`. It loads when the browser is idle. Default host is EU (`NEXT_PUBLIC_POSTHOG_HOST`, an extra optional variable).
- **Security headers** on every response: `nosniff`, a strict referrer policy, a permissions policy, HSTS, and a CSP limited to `frame-ancestors 'none'`, `base-uri`, `form-action` and `object-src`. A full script CSP would need nonces for Next's inline scripts.
- **Prisma** binary targets include `rhel-openssl-3.0.x` for Vercel. `next.config.ts` sets `outputFileTracingRoot` to the repo root and keeps BullMQ, ioredis, Prisma and the AWS SDK as external server packages. These are also direct web dependencies, so pnpm can resolve them from `apps/web`.
- **Worker image** runs as the Playwright image's unprivileged `pwuser`, uses Ubuntu's FFmpeg (`FFMPEG_PATH=/usr/bin/ffmpeg`), and runs `pnpm db:deploy` as Railway's pre-deploy step. Chromium runs with Playwright's default `--no-sandbox`; the container is the isolation boundary.
- **Legal pages** are written plainly for Nova Pixel Studios with contact addresses `hello@`, `abuse@` and `privacy@weshot.app`. They need a lawyer's review before launch.

## Redis instead of Postgres (after launch prep)

- **Owner's call: Redis is the only datastore.** Postgres and Prisma are gone. Job and share records (same fields as product spec §4.8) live in Redis hashes (`packages/server/src/records.ts`). Job records expire after 30 days through a TTL. Share records expire at `expiresAt` through `EXPIREAT`. A sorted set by expiry time lets the daily cron delete expired share files from R2 right away (R2's 30-day lifecycle rule remains the safety net). That leaves one fewer service to run and pay for, since BullMQ needs Redis anyway.
- Job ids are UUIDs (`crypto.randomUUID`) instead of cuids.
- Redis must use `maxmemory-policy noeviction` (BullMQ requirement, and records must not be evicted). Local `docker-compose.yml` sets it; DEPLOY.md says where to set it on Redis Cloud.
- The Phase 1 notes about Prisma, the Prisma schema, migrations and `DATABASE_URL` no longer apply.

## Mobile editor follow-up

- **Expandable controls sheet.** The grabber is a real button: tap it, or drag up/down, to expand or collapse. Expanded hides the paste bar and presets and shrinks the preview to `clamp(120px, 22dvh, 180px)`, so the controls get most of the screen while changes stay visible. Collapsed, the preview is `clamp(150px, 30dvh, 290px)` instead of a fixed 290 px, so short phones still show controls.
- **The mobile editor uses `100dvh`** (the visible screen), so the Download footer never sits behind mobile browser toolbars.
- **Full-page threshold raised from 2 : 1 to 3 : 1.** Phone screenshots (about 2.2 : 1) were being treated as full-page captures and cropped to their top. They are now shown whole.

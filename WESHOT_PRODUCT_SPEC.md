# WeShot — Product & Production Spec

Version 1.0 · October 2026 · Owner: Nova Pixel Studios

WeShot turns a website link or a pasted screenshot into a polished image or scroll video, framed in a macOS-style window on a background the user picks. It is free, has no accounts and no sign-in, and lives on one page: paste into the bar, style, download.

This document is the source of truth for **what** to build and **how it runs in production**. The companion file `WESHOT_UI_SPEC.md` is the source of truth for **how it looks and behaves**.

---

## 1. Product principles

1. **One page, one bar.** Everything starts from the paste bar on the landing page. The editor sits directly under it on the same page.
2. **No accounts, ever.** No sign-in, no email capture, no pricing, no watermark, no credits. Anything that would need an account is out of scope.
3. **Instant styling.** Changing the frame, background, padding or shadow never re-captures the page. It re-renders locally in under 16 ms.
4. **Pasted images never leave the browser** unless the user explicitly creates a share link.
5. **Free means cheap to run.** Do as much as possible client-side. The server only does what a browser cannot: capture a third-party URL and render a scroll video.

## 2. Scope

### 2.1 In scope (v1, launch)

| Area | Feature |
| --- | --- |
| Input | Paste a URL into the bar; paste an image (Ctrl/Cmd+V anywhere on the page); drag-and-drop an image anywhere on the page; upload-image button in the bar |
| Capture (URL only) | Viewport presets (Desktop 1440×900, Laptop 1280×800, Tablet 834×1194, Mobile 390×844), custom width/height, device scale 1x/2x/3x, full-page toggle, force dark or light color scheme, delay 0–10 s, hide cookie banners and chat widgets (on by default), re-capture button |
| Frame | Window style: macOS, Safari (with address bar), None. Theme: Dark glass / Light glass. Title bar content: URL pill, page title, empty, custom text. Traffic lights: color / mono / hidden |
| Background | 6 built-in backgrounds (see UI spec), custom solid color, custom 2-stop gradient, upload background image, blur 0–40 px, grain 0–20 %, transparent |
| Layout | Padding 0–200 px, corner radius 0–24 px, shadow None/Soft/Deep, canvas size Auto or a platform preset, window scale and offset (lets the window bleed off an edge) |
| Presets | 3 built-in presets (Launch post, Portfolio, Minimal). Users save their own presets; stored in `localStorage`, exportable/importable as JSON |
| Record (URL only) | Scroll-through and Section tour; length 5–60 s; easing; pause at headings; animated cursor; 30/60 fps |
| Download | Image: PNG, JPG, WebP at 1x/2x/4x. Video: MP4 (H.264), WebM, GIF (max 15 s, 800 px wide). Copy image to clipboard. Size presets: X post 1600×900, LinkedIn 1200×627, Instagram 1080×1350, Product Hunt 1270×760, OG image 1200×630, Dribbble 1600×1200 |
| Share | Optional share link (`/s/{id}`) that hosts the exported file for 30 days, with Open Graph tags so it previews in X, WhatsApp and Slack. Returns a private delete token the browser keeps in `localStorage` |

### 2.2 Out of scope (do not build)

Accounts, sign-in, pricing, payments, credits, watermarks, teams, API keys / public API, scheduled captures, browser extension, logged-in page capture, Figma plugin.

## 3. User flows

### 3.1 Link flow
1. User pastes `queuely.app` into the bar and presses Enter or **Frame it**.
2. The app normalises the URL (adds `https://`), validates it, and smooth-scrolls to the editor.
3. The preview shows a skeleton window with live status: "Loading page" → "Waiting for fonts" → "Framing". Target p50 ≤ 6 s for a viewport capture.
4. The raw capture appears framed with the current preset. Every style change re-renders instantly.
5. Changing a **capture** setting (device, scale, full page, color scheme, delay, banners) shows a **Re-capture** button on the URL row. It does not auto-recapture.
6. **Download** exports at the chosen size; **Copy** copies a PNG to the clipboard; **Share link** uploads and returns a URL.

### 3.2 Image flow
1. User pastes or drops an image anywhere, or uses the image button in the bar.
2. The image is read with `FileReader`/`createImageBitmap`, never uploaded, and appears framed immediately.
3. Capture-only controls (device, full page, Record) are disabled with a tooltip: "Available for links".

### 3.3 Recording flow (link only)
1. User opens **Record**, picks a type and length, presses **Record scroll video**.
2. A floating status pill over the preview shows progress ("Recording 7.2 s / 12 s") and a **Stop** button. The user can keep styling while it records; the video uses the frame settings at the moment Record was pressed.
3. On completion the Download panel switches to Video with the file ready.

## 4. Architecture

```
Browser (Next.js page)                    Server
──────────────────────────────            ──────────────────────────────────────
Paste bar ─┬─ image → local bitmap        Next.js route handlers (Vercel)
           └─ URL ──POST /api/capture ──►   validate, rate-limit, enqueue  ──► Redis (BullMQ)
                                                                                  │
Frame compositor (canvas, pure TS)        Capture worker (Railway, Playwright) ◄─┘
  preview + export at any size              screenshots → R2
  builds "frame template" PNG for video     scroll recordings → FFmpeg → R2
                                         Postgres (Prisma): jobs, shares
SSE /api/jobs/:id/events ◄─────────────── job status
```

### 4.1 Repository layout (pnpm workspaces)

```
weshot/
  apps/web/          Next.js 15 App Router, TypeScript, Tailwind CSS
  apps/worker/       Node 20 + Playwright (Chromium) + FFmpeg, BullMQ consumer
  packages/frame/    Pure TS frame compositor: renderFrame(ctx, input, settings)
  packages/shared/   Zod schemas, settings types, presets, constants
  prisma/            schema.prisma (shared by web and worker)
```

### 4.2 Stack

| Layer | Choice |
| --- | --- |
| Web app | Next.js (App Router), TypeScript, Tailwind CSS, Zustand for editor state |
| Validation | Zod, shared between client, API and worker |
| Database | PostgreSQL + Prisma (jobs and share links only) |
| Queue | BullMQ on Redis |
| Capture worker | Playwright Chromium, `playwright-extra` stealth optional, `@ghostery/adblocker-playwright` for ads/banners |
| Video | Frame sequence → FFmpeg (`ffmpeg-static`) |
| Storage | Cloudflare R2 (S3 API) behind a CDN, presigned URLs |
| Bot protection | Cloudflare Turnstile (invisible) on capture and record requests |
| Hosting | Web on Vercel; worker, Redis and Postgres on Railway |
| Monitoring | Sentry (web + worker), PostHog (anonymous, no cookies banner needed if configured cookieless) |

### 4.3 The frame compositor (the core)

`packages/frame` exports one pure function used everywhere:

```ts
renderFrame(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  source: ImageBitmap | HTMLImageElement | null,   // null = draw template only
  settings: FrameSettings,
  output: { width: number; height: number; scale: number }
): { contentRect: Rect }   // where the page image sits, in output px
```

Rules:
- Preview and export call the **same** function, so the download matches the preview pixel for pixel.
- Draw order: background (color / gradient / image with blur) → grain → window shadow → window body with rounded clip → title bar (glass: draw the background region behind it with `ctx.filter = 'blur(20px)'`, then a translucent fill) → traffic lights → title bar text/pill → page image clipped to the content area.
- Export renders on an `OffscreenCanvas` at `output × scale` inside a Web Worker so the UI never freezes.
- Unit-tested with snapshot images for each built-in preset (Vitest + `@napi-rs/canvas` in Node).

### 4.4 Settings model (`packages/shared`)

```ts
type CaptureSettings = {
  url: string;
  viewport: { width: number; height: number };  // 320–3840 × 320–2160
  scale: 1 | 2 | 3;
  fullPage: boolean;
  colorScheme: 'light' | 'dark' | 'auto';
  delayMs: number;            // 0–10000
  hideBanners: boolean;
};

type FrameSettings = {
  window: { style: 'macos' | 'safari' | 'none'; theme: 'dark' | 'light';
            titleBar: 'url' | 'title' | 'empty' | { custom: string };
            lights: 'color' | 'mono' | 'hidden'; radius: number };
  background: { kind: 'preset'; id: BackgroundId }
            | { kind: 'solid'; color: string }
            | { kind: 'gradient'; from: string; to: string; angle: number }
            | { kind: 'image'; src: string }
            | { kind: 'transparent' };
  blur: number; grain: number;
  padding: number; shadow: 'none' | 'soft' | 'deep';
  canvas: 'auto' | SizePresetId | { width: number; height: number };
  windowScale: number; windowOffset: { x: number; y: number };
};

type RecordSettings = {
  type: 'scroll' | 'tour'; sections?: string[];  // CSS selectors for tour
  lengthSec: number; easing: 'linear' | 'easeInOut';
  pauseAtHeadings: boolean; cursor: boolean; fps: 30 | 60;
  format: 'mp4' | 'webm' | 'gif';
};
```

### 4.5 API (internal, used only by the web app)

| Method | Path | Body / result |
| --- | --- | --- |
| POST | `/api/capture` | `{ capture: CaptureSettings, turnstileToken }` → `{ jobId }` |
| POST | `/api/record` | `{ capture, record: RecordSettings, templatePngKey, contentRect, turnstileToken }` → `{ jobId }` |
| GET | `/api/jobs/:id/events` | SSE stream: `status` (`queued`, `loading`, `fonts`, `capturing`, `encoding`, `done`, `failed`), `progress` (0–1), `result` (`{ assetUrl }`), `error` (`{ code, message }`) |
| POST | `/api/uploads` | `{ kind: 'template' \| 'share', contentType }` → presigned R2 PUT URL + key |
| POST | `/api/share` | `{ key, kind: 'image' \| 'video', width, height }` → `{ id, url, deleteToken }` |
| DELETE | `/api/share/:id` | header `x-delete-token` → 204 |
| GET | `/s/:id` | Share viewer page with OG/Twitter meta |

### 4.6 Capture worker

1. Resolve the URL's DNS first; **reject** private and reserved ranges (10/8, 172.16/12, 192.168/16, 127/8, 169.254/16 incl. 169.254.169.254, ::1, fc00::/7) and non-http(s) schemes. Re-check after every redirect (max 5).
2. New isolated browser context per job: viewport, `deviceScaleFactor`, `colorScheme`, realistic user agent, `acceptDownloads: false`, 30 s navigation timeout, 50 MB response cap.
3. Block ads/trackers; when `hideBanners` is on, run the consent-banner dismisser and inject CSS hiding common chat widgets and cookie bars.
4. Wait for `networkidle` (max 10 s), then `document.fonts.ready`, then lazy-image scroll pass for full-page, then `delayMs`.
5. Screenshot (PNG) → R2 key `captures/{yyyy-mm-dd}/{jobId}.png`, TTL 24 h via R2 lifecycle rule.
6. Emit progress events through BullMQ → Redis pub/sub → SSE.

### 4.7 Recording pipeline

1. The browser renders a **frame template**: `renderFrame(ctx, null, settings, output)` at the video size, with the content rect left transparent, uploads it to R2, and sends `templatePngKey` + `contentRect`.
2. The worker scrolls the page with the chosen easing, capturing frames via CDP `Page.startScreencast` (or stepped screenshots) at the target fps; it draws the cursor overlay if enabled.
3. FFmpeg scales page frames into `contentRect`, applies a rounded-corner alpha mask, overlays them under the template, and encodes:
   - MP4: `libx264 -pix_fmt yuv420p -crf 20 -preset veryfast -movflags +faststart`
   - WebM: `libvpx-vp9 -crf 32 -b:v 0`
   - GIF: two-pass `palettegen`/`paletteuse`, 15 fps, 800 px wide, max 15 s
4. Upload to R2 `recordings/{date}/{jobId}.{ext}`, TTL 24 h.

### 4.8 Data model (Prisma)

```prisma
model Job {
  id         String   @id @default(cuid())
  kind       JobKind  // CAPTURE | RECORD
  status     String
  url        String
  ipHash     String   // sha256(ip + daily salt), never the raw IP
  assetKey   String?
  errorCode  String?
  durationMs Int?
  createdAt  DateTime @default(now())
  @@index([createdAt])
}

model Share {
  id          String   @id            // 10-char nanoid
  assetKey    String
  kind        String   // image | video
  width       Int
  height      Int
  deleteHash  String   // sha256(deleteToken)
  expiresAt   DateTime // createdAt + 30 days
  createdAt   DateTime @default(now())
  @@index([expiresAt])
}
```

A daily cron deletes expired shares and their R2 objects, and `Job` rows older than 30 days.

## 5. Limits, abuse and safety

| Limit | Value |
| --- | --- |
| Captures per IP | 30 per hour, 150 per day |
| Recordings per IP | 5 per hour, 20 per day |
| Concurrent jobs per IP | 2 |
| Turnstile | Required on every capture and record call (invisible) |
| Max video length | 60 s (GIF 15 s) |
| Max full-page height | 16,000 px (taller pages are cut, with a notice) |
| Pasted image max | 25 MB, longest side 8,000 px |
| Share file max | 50 MB |

- Domain blocklist for known phishing/malware lists and adult content; report link on every share page.
- Only hashed IPs are stored. No cookies except Turnstile's. Privacy page states this plainly.

## 6. Errors (user-facing copy)

| Code | Message | Action offered |
| --- | --- | --- |
| `INVALID_URL` | That doesn't look like a web address. | Focus the bar |
| `BLOCKED_HOST` | WeShot can't open private or local addresses. | Paste a screenshot instead |
| `TIMEOUT` | The page took longer than 30 seconds to load. | Retry · Paste a screenshot |
| `BOT_CHECK` | This site blocks automated browsers. | Paste a screenshot instead |
| `HTTP_4XX/5XX` | The site returned an error ({status}). | Retry |
| `RATE_LIMIT` | You've made a lot of captures this hour. Try again in {minutes} min. | — |
| `IMAGE_TOO_LARGE` | That image is over 25 MB. | — |

## 7. Non-functional requirements

- **Performance:** landing LCP < 2.0 s on 4G; editor JS < 180 kB gzipped before the compositor worker; style change → preview update < 16 ms; 2x PNG export of 1600×900 < 800 ms on a mid-range laptop.
- **Capture SLO:** p50 ≤ 6 s, p95 ≤ 15 s; failure rate < 3 % excluding bot-blocked sites.
- **Accessibility:** WCAG 2.2 AA; full keyboard operation of the editor; visible focus; `prefers-reduced-motion` disables the scroll-into-view animation and glow motion.
- **Browsers:** last 2 versions of Chrome, Safari, Firefox, Edge; iOS Safari 17+; Android Chrome. Provide a non-blurred fallback when `backdrop-filter` is unsupported.
- **SEO:** static landing HTML, OG image, sitemap, `robots.txt`; share pages `noindex`.

## 8. Environment variables

```
# web
DATABASE_URL=
REDIS_URL=
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=weshot
R2_PUBLIC_BASE_URL=https://cdn.weshot.app
TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=
IP_HASH_SALT=
NEXT_PUBLIC_SITE_URL=https://weshot.app
SENTRY_DSN=
NEXT_PUBLIC_POSTHOG_KEY=

# worker (plus DATABASE_URL, REDIS_URL, R2_*)
WORKER_CONCURRENCY=4
CAPTURE_TIMEOUT_MS=30000
```

## 9. Deployment

- **Vercel:** `apps/web`. Route handlers on the Node runtime. Preview deployments per PR.
- **Railway:** `apps/worker` (Dockerfile based on `mcr.microsoft.com/playwright:v1.x-jammy` + FFmpeg), Redis, Postgres. Start at 1 worker × 4 concurrency; autoscale on queue depth > 20.
- **Cloudflare:** R2 bucket with lifecycle rules (`captures/` and `recordings/` 1 day, `shares/` 30 days), CDN on `cdn.weshot.app`, Turnstile.
- **CI (GitHub Actions):** typecheck, lint, Vitest, compositor snapshot tests, Playwright e2e against the web app with a mocked worker.

## 10. Launch checklist

- [ ] Final name and domain confirmed; Givonic web-font licence purchased (or Outfit used)
- [ ] SSRF tests pass (private IPs, redirects to private IPs, IPv6, DNS rebinding)
- [ ] All 6 built-in backgrounds and 3 presets match the UI spec
- [ ] Download output matches preview (snapshot test) for PNG at 1x/2x/4x
- [ ] Recording works for MP4, WebM and GIF on 5 test sites
- [ ] Error messages from section 6 verified
- [ ] Lighthouse ≥ 95 performance and accessibility on the landing page
- [ ] Terms and Privacy pages published (Nova Pixel Studios)

## 11. Success metrics (first 90 days)

| Metric | Target |
| --- | --- |
| Paste-to-download rate | ≥ 40 % of sessions that paste something |
| Capture p50 | ≤ 6 s |
| Capture failure rate | < 3 % |
| Share links created | Track weekly; the main word-of-mouth loop |
| Monthly running cost | Under $60 at 20k captures/month |

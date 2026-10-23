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

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

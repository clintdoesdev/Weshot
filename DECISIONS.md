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

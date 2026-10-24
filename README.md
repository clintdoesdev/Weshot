# WeShot

A free web tool that turns a website link or a pasted screenshot into an image framed in a macOS-style window on a
background you pick. No accounts, no sign-in, no pricing, and no services to set up: it is one Next.js app.

- `WESHOT_PRODUCT_SPEC.md` / `WESHOT_UI_SPEC.md`: the original specs (recording and share links have since been removed; see `DECISIONS.md`)
- `DECISIONS.md`: choices made where the specs are silent, and later scope changes
- `DEPLOY.md`: deploying to Vercel (no keys required)
- `LAUNCH.md`: launch checklist status

## Layout

```
apps/web/          Next.js 15: landing page, editor, /api/capture (headless Chrome), Terms, Privacy
packages/capture/  Website snaps: Playwright + serverless Chromium behind an SSRF-safe proxy
packages/frame/    renderFrame(): the compositor behind the preview and every export
packages/shared/   Zod schemas, settings types, presets, backgrounds, limits, error copy
```

## Run it

```bash
pnpm install
pnpm --filter @weshot/web exec playwright install chromium
pnpm dev            # http://localhost:3000
```

| Script | What it does |
| --- | --- |
| `pnpm dev` | The web app in watch mode |
| `pnpm build` | Every package |
| `pnpm test` | Vitest: schemas, compositor snapshots, rate limits, SSRF suite and captures in real Chromium |
| `pnpm test:e2e` | Playwright e2e (desktop + mobile, axe) against a production build with canned captures |
| `pnpm lint` / `pnpm typecheck` | ESLint / `tsc --noEmit` in strict mode |
| `pnpm --filter @weshot/frame test:update` | Rewrite compositor snapshots after an intended visual change |
| `pnpm --filter @weshot/web render:static` | Re-render the gallery, mobile demo and OG images |

## Fonts

UI type is `'Givonic', 'Outfit', system-ui, sans-serif`. Outfit loads via `next/font/google`. To use Givonic,
drop the licensed WOFF2 files into `apps/web/src/fonts/givonic/`; the build picks them up automatically.

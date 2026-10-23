# WeShot

A free web tool that turns a website link or a pasted screenshot into an image or scroll video, framed in a
macOS-style window on a background you pick. No accounts, no sign-in, no pricing.

- `WESHOT_PRODUCT_SPEC.md`: scope, architecture, API, limits (source of truth for behaviour and production)
- `WESHOT_UI_SPEC.md`: tokens, components, screens, copy (source of truth for look and feel)
- `DECISIONS.md`: choices made where the specs are silent
- `DEPLOY.md`: Vercel, Railway and Cloudflare setup, step by step
- `LAUNCH.md`: launch checklist status

## Layout

```
apps/web/          Next.js 15 App Router: landing page, editor, API routes, share pages
apps/worker/       BullMQ consumer: Playwright Chromium behind an SSRF proxy, FFmpeg recordings
packages/frame/    renderFrame(): the compositor behind preview, export and video templates
packages/shared/   Zod schemas, settings types, presets, backgrounds, limits, error copy
packages/server/   Node-only helpers shared by web and worker: storage (R2/local), Redis, queues, rate limits
prisma/            schema.prisma and migrations
```

## Run it

```bash
pnpm install
cp .env.example .env
pnpm services:up          # Postgres + Redis (Docker)
pnpm db:migrate
pnpm dev                  # web on http://localhost:3000 and the worker
```

Image mode (paste, drop or pick a screenshot) needs no backend: `pnpm dev:web` is enough.
Without R2 variables, captures, recordings and share files are stored in `.data/storage`.

| Script | What it does |
| --- | --- |
| `pnpm dev` | Web + worker in watch mode |
| `pnpm build` | Prisma client + every package |
| `pnpm test` | Vitest everywhere: schemas, compositor snapshots, Redis limits, SSRF suite, recordings |
| `pnpm test:e2e` | Playwright e2e (desktop + mobile, axe) against a production build with a mocked worker |
| `pnpm lint` / `pnpm typecheck` | ESLint / `tsc --noEmit` in strict mode |
| `pnpm --filter @weshot/frame test:update` | Rewrite compositor snapshots after an intended visual change |
| `pnpm --filter @weshot/web render:static` | Re-render gallery, recordings card and OG images |

The worker tests need Chromium (`pnpm --filter @weshot/worker exec playwright install chromium`) and use the
bundled `ffmpeg-static`. Redis tests run when Redis is reachable at `REDIS_URL` and skip otherwise.

## Fonts

UI type is `'Givonic', 'Outfit', system-ui, sans-serif`. Outfit loads via `next/font/google`. To use Givonic,
drop the licensed WOFF2 files into `apps/web/src/fonts/givonic/` (names in the README there); the build picks
them up automatically.

# WeShot

Turn a website link or a pasted screenshot into an image or scroll video framed in a macOS-style window.

- Product spec: `WESHOT_PRODUCT_SPEC.md`
- UI spec: `WESHOT_UI_SPEC.md`
- Decisions where the specs are silent: `DECISIONS.md`
- Deployment: `DEPLOY.md`

## Local development

```bash
pnpm install
cp .env.example .env
pnpm services:up          # Postgres + Redis (docker compose)
pnpm db:migrate
pnpm dev                  # web on http://localhost:3000, worker alongside
```

Image mode (paste or drop a screenshot) works without any backend: `pnpm dev:web` is enough.

| Script | What it does |
| --- | --- |
| `pnpm dev` | Web + worker in watch mode |
| `pnpm build` | Builds every package |
| `pnpm test` | Vitest in every package (incl. compositor snapshots and SSRF suite) |
| `pnpm test:e2e` | Playwright e2e against the web app |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | `tsc --noEmit` everywhere |

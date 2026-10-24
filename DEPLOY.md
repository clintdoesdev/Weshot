# Deploying WeShot

WeShot is one Next.js app on Vercel. The website screenshots ("snaps") are taken by a headless Chrome that runs
inside the app's own `/api/capture` function, so there is **no worker, no database, no storage bucket and no
required keys**.

## Deploy (5 minutes)

1. [vercel.com/new](https://vercel.com/new) → import the repository. If Vercel shows several apps, press
   **Import single project** next to **web**.
2. Check **Root Directory** is `apps/web` and **Framework Preset** is Next.js.
3. Press **Deploy**. That's it.

The capture function gets 2 GB of memory and up to 60 s (`apps/web/vercel.json`), which fits the Hobby plan.

## Optional extras

None of these are needed. Add them in Vercel → Settings → Environment Variables, then redeploy.

| Variable | What it does |
| --- | --- |
| `REDIS_URL` | Shares rate limits across all server instances. Vercel → Storage → Redis adds it for you. Without it, limits are kept per instance. |
| `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | Adds Cloudflare's invisible bot check to link captures. Set both or neither. |
| `NEXT_PUBLIC_SITE_URL` | Your public address (e.g. `https://weshot.app`) for Open Graph tags and the sitemap. |
| `IP_HASH_SALT` | Any long random string; mixed into the hashed IPs used for rate limits. |
| `SENTRY_DSN`, `NEXT_PUBLIC_POSTHOG_KEY` | Error reports and cookieless usage counts. |

`https://<your site>/api/health` shows what is switched on.

## Notes

- **Limits per IP:** 30 captures an hour, 150 a day, 2 at a time.
- **Response size:** serverless responses are capped at about 4.5 MB. Large screenshots come back as JPEG, and very long
  full-page captures fall back to 1x; if a page is still too big the user is asked to turn off Full page.
- **Domain blocklist:** `apps/web/src/lib/server/blocklist-data.ts` (phishing, malware, adult). Refresh it from public
  feeds (URLhaus, Phishing Army) before launch.
- **Never** set `E2E_MOCK_CAPTURE` or `NEXT_PUBLIC_E2E` outside tests.

## CI

`.github/workflows/ci.yml` runs lint, typecheck, unit and compositor snapshot tests, the SSRF and capture tests in real
Chromium, and Playwright e2e (desktop + mobile, with axe accessibility checks) against a production build.

## Local development

```bash
pnpm install
pnpm --filter @weshot/web exec playwright install chromium   # the browser used for local captures
pnpm dev                                                     # http://localhost:3000
```

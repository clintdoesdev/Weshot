# Deploying WeShot

| Piece | Where | Notes |
| --- | --- | --- |
| Web app (`apps/web`) | Vercel | Next.js 15, Node runtime route handlers, daily cron |
| Worker (`apps/worker`) | Railway | Docker image on `mcr.microsoft.com/playwright:v1.56.1-jammy` + FFmpeg |
| Postgres, Redis | Railway | Jobs and share links; BullMQ queue and job events |
| Storage + CDN | Cloudflare R2 on `cdn.weshot.app` | Lifecycle rules delete temporary files |
| Bot protection | Cloudflare Turnstile | Invisible, on every capture and record call |
| Monitoring | Sentry, PostHog | Both optional; nothing loads without keys |

Do the steps in order: Cloudflare, then Railway, then Vercel.

---

## 1. Cloudflare

### 1.1 R2 bucket

1. Cloudflare dashboard → **R2 Object Storage** → **Create bucket** → name `weshot`, location *Automatic* → **Create bucket**.
2. Bucket → **Settings** → **Custom Domains** → **Connect Domain** → `cdn.weshot.app` → **Connect**. (The `weshot.app` zone must be on Cloudflare.) This URL is `R2_PUBLIC_BASE_URL`.
3. Bucket → **Settings** → **Object lifecycle rules** → **Add rule**, four times (product spec §9):

   | Rule name | Prefix | Action |
   | --- | --- | --- |
   | `captures-1d` | `captures/` | Delete objects 1 day after creation |
   | `recordings-1d` | `recordings/` | Delete objects 1 day after creation |
   | `templates-1d` | `templates/` | Delete objects 1 day after creation |
   | `shares-30d` | `shares/` | Delete objects 30 days after creation |

   The daily cron (section 3.4) deletes expired or deleted shares immediately; `shares-30d` is the safety net.
4. Bucket → **Settings** → **CORS Policy** → **Edit** → paste and save:

   ```json
   [
     {
       "AllowedOrigins": ["https://weshot.app", "https://www.weshot.app"],
       "AllowedMethods": ["GET", "HEAD", "PUT"],
       "AllowedHeaders": ["content-type"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```

   `PUT` is for presigned uploads (video templates, share files) straight from the browser; `GET` lets the editor fetch captures as blobs. Add your Vercel preview domain if you want captures to work on previews.
5. **R2 Object Storage** → **Manage API tokens** → **Create API token** → *Object Read & Write*, *Apply to specific buckets only* → `weshot` → **Create**. Note the **Access Key ID**, **Secret Access Key** and your **Account ID**.

### 1.2 Turnstile

1. Dashboard → **Turnstile** → **Add widget** → name `WeShot`, hostnames `weshot.app` (and `localhost` if you want real checks locally), **Widget mode: Invisible** → **Create**.
2. Note the **Site key** (`TURNSTILE_SITE_KEY`) and **Secret key** (`TURNSTILE_SECRET_KEY`).

---

## 2. Railway (worker, Postgres, Redis)

1. [railway.com](https://railway.com) → **New Project** → **Deploy from GitHub repo** → pick this repository. Railway creates a service; rename it `worker`.
2. In the project: **+ Create** → **Database** → **PostgreSQL**. Again: **+ Create** → **Database** → **Redis**.
3. `worker` service → **Settings**:
   - **Source → Root Directory**: leave empty (the Dockerfile needs the whole monorepo).
   - **Config-as-code → Railway config file**: `apps/worker/railway.json`. This sets the Dockerfile, runs `pnpm db:deploy` (Prisma migrations) before each deploy, and starts `node apps/worker/dist/index.js`.
   - **Networking**: no public domain needed; the worker only talks to Redis, Postgres and R2.
   - **Resources**: start at 1 replica, 4 vCPU / 4 GB (one Chromium per job, up to 4 at once).
4. `worker` service → **Variables** → add:

   ```
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   REDIS_URL=${{Redis.REDIS_URL}}
   R2_ACCOUNT_ID=<account id>
   R2_ACCESS_KEY_ID=<access key id>
   R2_SECRET_ACCESS_KEY=<secret access key>
   R2_BUCKET=weshot
   R2_PUBLIC_BASE_URL=https://cdn.weshot.app
   WORKER_CONCURRENCY=4
   CAPTURE_TIMEOUT_MS=30000
   SENTRY_DSN=<optional, worker project DSN>
   ```
5. Deploy. The logs should end with `WeShot worker ready (concurrency 4)`.
6. Postgres and Redis must be reachable from Vercel: Postgres → **Settings → Networking → TCP Proxy → Enable**; same for Redis. Use the **public** URLs (`DATABASE_PUBLIC_URL`, `REDIS_PUBLIC_URL`) on Vercel.
7. **Scaling (product spec §9)**: when the `capture` queue regularly has more than 20 waiting jobs, raise `numReplicas` in `apps/worker/railway.json` (or **Settings → Deploy → Replicas**). Check depth with `redis-cli -u $REDIS_URL LLEN bull:capture:wait`.

---

## 3. Vercel (web)

1. [vercel.com/new](https://vercel.com/new) → import the repository.
2. **Configure Project**:
   - **Framework Preset**: Next.js
   - **Root Directory**: `apps/web` (enable *Include files outside the root directory in the Build Step*, the default)
   - **Install Command**: `pnpm install --frozen-lockfile`
   - **Build Command**: `cd ../.. && pnpm db:generate && cd apps/web && pnpm build`
   - **Node.js Version** (Settings → General): 22.x
3. **Environment Variables** (Production and Preview):

   ```
   DATABASE_URL=<Railway Postgres public URL>
   REDIS_URL=<Railway Redis public URL>
   R2_ACCOUNT_ID=<account id>
   R2_ACCESS_KEY_ID=<access key id>
   R2_SECRET_ACCESS_KEY=<secret access key>
   R2_BUCKET=weshot
   R2_PUBLIC_BASE_URL=https://cdn.weshot.app
   TURNSTILE_SITE_KEY=<site key>
   TURNSTILE_SECRET_KEY=<secret key>
   IP_HASH_SALT=<long random string, e.g. openssl rand -hex 32>
   NEXT_PUBLIC_SITE_URL=https://weshot.app
   CRON_SECRET=<long random string>
   SENTRY_DSN=<optional, web project DSN>
   NEXT_PUBLIC_POSTHOG_KEY=<optional, project API key>
   NEXT_PUBLIC_POSTHOG_HOST=<optional, defaults to https://eu.i.posthog.com>
   BLOCKLIST_EXTRA=<optional, comma-separated domains>
   ```

   Never set `E2E_MOCK_WORKER` or `NEXT_PUBLIC_E2E` outside tests.
4. **Deploy**. Then **Settings → Domains** → add `weshot.app` (and redirect `www.weshot.app` to it).
5. **Cron**: `apps/web/vercel.json` schedules `GET /api/cron/expire` daily at 03:17 UTC. Vercel sends `Authorization: Bearer $CRON_SECRET` automatically once `CRON_SECRET` is set. Check **Settings → Cron Jobs** after the first deploy. To run it by hand:
   `curl -H "Authorization: Bearer $CRON_SECRET" https://weshot.app/api/cron/expire`
6. **Function duration**: `/api/jobs/[id]/events` streams for up to 300 s (`maxDuration = 300`), which needs a Pro plan; on Hobby (60 s) the browser's EventSource reconnects and the stream replays the latest state, so long recordings still finish.
7. **Preview deployments** are created for every pull request automatically (product spec §9). They share the production Redis/Postgres unless you give the Preview environment its own `DATABASE_URL`/`REDIS_URL`.

---

## 4. Monitoring

- **Sentry**: create two projects (Next.js for web, Node for worker) and set `SENTRY_DSN` on Vercel and Railway. The browser SDK loads as a separate chunk only when a DSN is set. Source map upload is optional: add `SENTRY_AUTH_TOKEN` and wrap `next.config.ts` with `withSentryConfig` if you want readable stack traces.
- **PostHog**: create a project, set `NEXT_PUBLIC_POSTHOG_KEY`. It runs with memory persistence, no cookies, no autocapture and no session recording, so no cookie banner is needed. Events: `image_added`, `capture_started`, `capture_succeeded`, `capture_failed`, `download`, `copy`, `share_created`, `recording_started`, `recording_done`, `recording_failed`. Paste-to-download rate (product spec §11) = sessions with `download` ÷ sessions with `image_added` or `capture_succeeded`.

## 5. Domain blocklist

`apps/web/src/lib/server/blocklist-data.ts` is a seed list. Before launch, regenerate it from public feeds and commit:

- Phishing and malware: [URLhaus](https://urlhaus.abuse.ch/downloads/hostfile/) and [Phishing Army](https://phishing.army/download/phishing_army_blocklist.txt)
- Adult content: a curated list such as [StevenBlack porn extension](https://github.com/StevenBlack/hosts)

For urgent additions without a deploy, set `BLOCKLIST_EXTRA` on Vercel.

## 6. CI

`.github/workflows/ci.yml` runs on every push to `main` and every pull request:

1. **checks**: lint, typecheck, Vitest in every package (shared schemas, compositor snapshots, Redis rate limits, the SSRF suite and recordings in real Chromium + FFmpeg).
2. **e2e**: Playwright against a production build of the web app with the mocked worker, desktop and mobile, including axe accessibility checks.
3. **worker-image**: builds the worker Docker image.

## 7. Local development

```bash
pnpm install
cp .env.example .env
pnpm services:up      # Postgres + Redis in Docker
pnpm db:migrate
pnpm dev              # web on :3000 and the worker
```

Without R2 variables, files are stored in `.data/storage` and served by `/api/files/*`.

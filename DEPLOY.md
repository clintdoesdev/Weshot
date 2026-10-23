# Deploying WeShot

Web on **Vercel**; worker, Redis and Postgres on **Railway**; storage, CDN and bot protection on **Cloudflare**.
Steps are in the order you need them. Phase 7 completes this file with monitoring and CI.

## 1. Cloudflare R2 (storage + CDN)

1. Cloudflare dashboard → **R2** → **Create bucket** → name `weshot`, location Automatic.
2. Bucket → **Settings** → **Custom Domains** → **Connect Domain** → `cdn.weshot.app` (the zone must be on Cloudflare). This is `R2_PUBLIC_BASE_URL`.
3. Bucket → **Settings** → **Object lifecycle rules** → add three rules (product spec §9):

   | Rule name | Prefix | Action |
   | --- | --- | --- |
   | `captures-1d` | `captures/` | Delete objects 1 day after upload |
   | `recordings-1d` | `recordings/` | Delete objects 1 day after upload |
   | `templates-1d` | `templates/` | Delete objects 1 day after upload |
   | `shares-30d` | `shares/` | Delete objects 30 days after upload |

   Shares are also deleted by the daily cron the moment they expire or the owner deletes them; the 30-day rule is the safety net.
4. Bucket → **Settings** → **CORS policy** → paste:

   ```json
   [
     {
       "AllowedOrigins": ["https://weshot.app"],
       "AllowedMethods": ["GET", "PUT", "HEAD"],
       "AllowedHeaders": ["content-type"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```

   `PUT` is for presigned uploads of video templates and share files from the browser; `GET` lets the editor fetch captures as blobs.
5. R2 overview → **Manage R2 API Tokens** → **Create API token** → permission *Object Read & Write*, scoped to the `weshot` bucket. Copy the **Access Key ID** and **Secret Access Key** (`R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`); your account id is `R2_ACCOUNT_ID`.

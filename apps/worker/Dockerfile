# WeShot capture + recording worker (product spec §9).
# Build from the repo root:  docker build -f apps/worker/Dockerfile -t weshot-worker .
#
# The Playwright image ships Chromium for this exact Playwright version (1.56.1) and its system libraries.
FROM mcr.microsoft.com/playwright:v1.56.1-jammy

ENV NODE_ENV=production \
    PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright \
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 \
    FFMPEG_PATH=/usr/bin/ffmpeg \
    ADBLOCK_CACHE_DIR=/tmp

# FFmpeg with libx264 and libvpx for MP4, WebM and GIF encoding.
RUN apt-get update \
 && apt-get install -y --no-install-recommends ffmpeg ca-certificates \
 && rm -rf /var/lib/apt/lists/* \
 && corepack enable && corepack prepare pnpm@10.28.0 --activate

WORKDIR /app

# Install with only the manifests first so dependency layers cache well.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/worker/package.json apps/worker/
COPY packages/shared/package.json packages/shared/
COPY packages/server/package.json packages/server/
COPY packages/frame/package.json packages/frame/
RUN pnpm install --frozen-lockfile --filter weshot --filter "@weshot/worker..."

COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY packages/server packages/server
COPY apps/worker apps/worker
RUN pnpm --filter @weshot/worker build

# Chromium renders untrusted pages; run as the image's unprivileged user.
RUN chown -R pwuser:pwuser /app
USER pwuser

CMD ["node", "apps/worker/dist/index.js"]

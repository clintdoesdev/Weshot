import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadEnvConfig } from '@next/env';
import type { NextConfig } from 'next';

// Next runs with apps/web as the working directory; the monorepo root is two levels up.
const repoRoot = [resolve(process.cwd(), '../..'), process.cwd()].find((d) => existsSync(resolve(d, 'pnpm-workspace.yaml'))) ?? process.cwd();
// One .env at the repo root serves web and worker.
// forceReload: Next has already loaded (empty) env files from apps/web, and @next/env caches that result.
loadEnvConfig(repoRoot, process.env.NODE_ENV !== 'production', console, true);

const config: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@weshot/frame', '@weshot/shared', '@weshot/capture'],
  // Monorepo: trace workspace packages from the repo root.
  outputFileTracingRoot: repoRoot,
  // Native or dynamically-loaded server deps stay in node_modules instead of the route bundles.
  serverExternalPackages: ['@sparticuz/chromium', 'playwright-core', 'ioredis'],
  poweredByHeader: false,
  env: {
    // The spec names the variable TURNSTILE_SITE_KEY; the browser needs it too.
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.TURNSTILE_SITE_KEY ?? '',
    NEXT_PUBLIC_SENTRY_DSN: process.env.SENTRY_DSN ?? '',
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
          { key: 'Content-Security-Policy', value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'" },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        ],
      },
    ];
  },
  // Linting runs from the repo root (pnpm lint).
  eslint: { ignoreDuringBuilds: true },
};

export default config;

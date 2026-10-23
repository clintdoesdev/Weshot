import { loadEnvConfig } from '@next/env';
import type { NextConfig } from 'next';

// One .env at the repo root serves web, worker and Prisma.
const repoRoot = new URL('../..', import.meta.url).pathname;
loadEnvConfig(repoRoot);

const config: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@weshot/frame', '@weshot/shared', '@weshot/server'],
  // Monorepo: trace workspace packages and the Prisma engine from the repo root.
  outputFileTracingRoot: repoRoot,
  // Native or dynamically-loaded server deps stay in node_modules instead of the route bundles.
  serverExternalPackages: ['bullmq', 'ioredis', '@prisma/client', '@aws-sdk/client-s3', '@aws-sdk/s3-request-presigner'],
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

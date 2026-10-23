import { loadEnvConfig } from '@next/env';
import type { NextConfig } from 'next';

// One .env at the repo root serves web, worker and Prisma.
loadEnvConfig(new URL('../..', import.meta.url).pathname);

const config: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@weshot/frame', '@weshot/shared'],
  poweredByHeader: false,
  env: {
    // The spec names the variable TURNSTILE_SITE_KEY; the browser needs it too.
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.TURNSTILE_SITE_KEY ?? '',
  },
  // Linting runs from the repo root (pnpm lint).
  eslint: { ignoreDuringBuilds: true },
};

export default config;

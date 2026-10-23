import type { NextConfig } from 'next';

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

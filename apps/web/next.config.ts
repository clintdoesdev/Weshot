import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@weshot/frame', '@weshot/shared'],
  poweredByHeader: false,
  // Linting runs from the repo root (pnpm lint).
  eslint: { ignoreDuringBuilds: true },
};

export default config;

import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@weshot/frame', '@weshot/shared'],
  poweredByHeader: false,
};

export default config;

import type { captureRequestError } from '@sentry/nextjs';

/**
 * Server-side Sentry (product spec §4.2). Only loaded when SENTRY_DSN is set, so local dev and tests
 * carry no monitoring code.
 */
export async function register() {
  if (!process.env.SENTRY_DSN) return;
  const Sentry = await import('@sentry/nextjs');
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 0.05,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  });
}

export async function onRequestError(...args: Parameters<typeof captureRequestError>) {
  if (!process.env.SENTRY_DSN) return;
  const Sentry = await import('@sentry/nextjs');
  Sentry.captureRequestError(...args);
}

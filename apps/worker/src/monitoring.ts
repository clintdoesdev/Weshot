import * as Sentry from '@sentry/node';

/** Worker error reporting (product spec §4.2). A no-op without SENTRY_DSN. */
export function initMonitoring(): void {
  if (!process.env.SENTRY_DSN) return;
  Sentry.init({ dsn: process.env.SENTRY_DSN, tracesSampleRate: 0, environment: process.env.RAILWAY_ENVIRONMENT_NAME ?? process.env.NODE_ENV });
}

export function reportError(err: unknown, context: Record<string, string>): void {
  if (!process.env.SENTRY_DSN) return;
  Sentry.captureException(err, { tags: context });
}

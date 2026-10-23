/**
 * Browser Sentry, loaded as a separate chunk after the page is interactive and only when a DSN is configured,
 * so it never weighs on the landing page's first load.
 */
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn && typeof window !== 'undefined') {
  const start = () =>
    void import('@sentry/nextjs').then((Sentry) =>
      Sentry.init({
        dsn,
        tracesSampleRate: 0,
        // Pasted images never leave the browser; make sure breadcrumbs don't carry data URLs either.
        beforeBreadcrumb: (b) => (typeof b.data?.url === 'string' && b.data.url.startsWith('data:') ? null : b),
      }),
    );
  if ('requestIdleCallback' in window) requestIdleCallback(start, { timeout: 4000 });
  else setTimeout(start, 2000);
}

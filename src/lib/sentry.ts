/**
 * Optional Sentry for frontend. Only initializes when VITE_SENTRY_DSN is set.
 */

type SentryLike = {
  captureException: (error: unknown) => string | undefined;
};

let Sentry: SentryLike | null = null;

export function initSentry(): boolean {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn || typeof dsn !== 'string') return false;
  import('@sentry/react')
    .then((mod) => {
      mod.init({
        dsn,
        environment: import.meta.env.MODE,
        integrations: [
          mod.browserTracingIntegration(),
          mod.replayIntegration({ maskAllText: true }),
        ],
        tracesSampleRate: Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE || 0.1),
        replaysOnErrorSampleRate: 1,
      });
      Sentry = mod;
    })
    .catch(() => undefined);
  return true;
}

export function captureException(error: unknown): void {
  if (Sentry) Sentry.captureException(error);
}

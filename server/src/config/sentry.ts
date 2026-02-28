/* Optional Sentry instrumentation. Enabled only if SENTRY_DSN is provided.
 * Falls back to a no-op shim when @sentry/node is unavailable (e.g., offline env).
 */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { env } from './env';

let Sentry: any = {
  // No-op shim to keep middleware chain intact when Sentry is disabled
  init: () => { /* noop */ },
  Handlers: {
    requestHandler: () => (_req: any, _res: any, next: any) => next(),
    tracingHandler: () => (_req: any, _res: any, next: any) => next(),
    errorHandler: () => (_err: any, _req: any, _res: any, next: any) => next()
  }
};
let sentryAvailable = false;

try {
  // Dynamically require to avoid build errors when dependency is missing
  // eslint-disable-next-line global-require
  Sentry = require('@sentry/node');
  sentryAvailable = true;
} catch {
  sentryAvailable = false;
}

export function initSentry() {
  if (!process.env.SENTRY_DSN || !sentryAvailable) return false;
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: env.nodeEnv,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0.1)
  });
  return true;
}

export { Sentry };

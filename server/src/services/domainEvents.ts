import https from 'https';
import { env } from '../config/env';
import { redactPII } from '../utils/pii';

export type DomainEvent = {
  eventType: string;
  occurredAt?: string;
  actorId?: string;
  actorRole?: string;
  entityType?: string;
  entityId?: string;
  correlationId?: string;
  requestId?: string;
  payload?: Record<string, unknown>;
};

/**
 * Lightweight domain event publisher.
 * - If EVENT_WEBHOOK_URL is set, POST the event (fire-and-forget).
 * - Always log in development for observability.
 */
export function publishDomainEvent(event: DomainEvent) {
  const enriched = {
    ...event,
    occurredAt: event.occurredAt || new Date().toISOString(),
    service: 'zeni-api',
    payload: event.payload ? redactPII(event.payload) : undefined,
  };

  if (env.nodeEnv === 'development') {
    // eslint-disable-next-line no-console
    console.info('[domainEvent]', enriched);
  }

  const target = process.env.EVENT_WEBHOOK_URL;
  if (!target) return;

  try {
    const url = new URL(target);
    const body = JSON.stringify(enriched);
    const req = https.request(
      {
        method: 'POST',
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
        timeout: 3000,
      },
      (res) => res.on('data', () => undefined)
    );
    req.on('error', () => undefined);
    req.write(body);
    req.end();
  } catch {
    // swallow errors to avoid impacting request path
  }
}

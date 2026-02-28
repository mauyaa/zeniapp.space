import https from 'https';
import { env } from '../config/env';
import { getOrCreateCounter } from '../middlewares/metrics';
import { redactPII } from '../utils/pii';

// Lightweight forwarder to mirror audit events to an external sink (e.g., SIEM/webhook).
export function forwardAudit(event: Record<string, unknown>) {
  const url = process.env.AUDIT_WEBHOOK_URL || '';
  if (!url) return;
  const failureCounter = getOrCreateCounter('audit_forward_failures_total', 'Count of audit forward failures');
  try {
    const safeEvent = redactPII(event);
    const body = JSON.stringify({ ...safeEvent, forwardedAt: new Date().toISOString(), service: 'zeni-api' });
    const target = new URL(url);
    const req = https.request(
      {
        method: 'POST',
        hostname: target.hostname,
        port: target.port || 443,
        path: target.pathname + target.search,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body)
        },
        timeout: 3000
      },
      (res) => {
        // Drain response to free socket
        res.on('data', () => undefined);
      }
    );
    req.on('error', (err) => {
      failureCounter.inc();
      if (env.nodeEnv === 'development') {
        console.warn('[audit forward] failed', err.message);
      }
    });
    req.write(body);
    req.end();
  } catch (err) {
    const failureCounter = getOrCreateCounter('audit_forward_failures_total', 'Count of audit forward failures');
    failureCounter.inc();
    if (env.nodeEnv === 'development') {
      console.warn('[audit forward] failed', (err as Error).message);
    }
  }
}

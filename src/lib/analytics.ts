/**
 * Analytics events for funnel and support. Wire to gtag, Segment, or your backend.
 * Events: viewing_requested, viewing_fee_paid, refund_requested, refund_resolved.
 */

export type AnalyticsEvent =
  | { name: 'viewing_requested'; payload: { listingId: string; viewingId: string; hasFee: boolean } }
  | { name: 'viewing_fee_paid'; payload: { viewingId: string; amount: number; currency: string } }
  | { name: 'refund_requested'; payload: { transactionId: string; reasonLength: number } }
  | { name: 'refund_resolved'; payload: { requestId: string; decision: 'approved' | 'rejected' } };

function sendToGtag(event: AnalyticsEvent) {
  try {
    const gtag = (window as unknown as { gtag?: (a: string, b: string, c: Record<string, unknown>) => void }).gtag;
    if (typeof gtag === 'function') {
      gtag('event', event.name, event.payload as Record<string, unknown>);
    }
  } catch {
    // ignore
  }
}

/** Call from your backend or set VITE_ANALYTICS_ENDPOINT to POST events to your API. */
function sendToBackend(event: AnalyticsEvent) {
  const endpoint = (import.meta as { env?: { VITE_ANALYTICS_ENDPOINT?: string } }).env?.VITE_ANALYTICS_ENDPOINT;
  if (!endpoint) return;
  try {
    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: event.name, ...event.payload, ts: new Date().toISOString() }),
      keepalive: true
    }).catch(() => { /* ignore */ });
  } catch {
    // ignore
  }
}

export function trackEvent(event: AnalyticsEvent) {
  sendToGtag(event);
  sendToBackend(event);
}

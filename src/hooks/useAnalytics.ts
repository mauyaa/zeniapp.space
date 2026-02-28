/**
 * Optional analytics for key events. Only sends when VITE_ANALYTICS_ENDPOINT is set.
 * Events: search, listing_view, contact, payment, sign_up.
 */

const ENDPOINT = typeof import.meta !== 'undefined' && import.meta.env?.VITE_ANALYTICS_ENDPOINT;

type EventName = 'search' | 'listing_view' | 'contact' | 'payment' | 'sign_up';

type Payload = {
  event: EventName;
  timestamp: string;
  [key: string]: unknown;
};

function send(payload: Payload) {
  if (!ENDPOINT || typeof fetch === 'undefined') return;
  try {
    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, timestamp: new Date().toISOString() }),
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // ignore
  }
}

export function useAnalytics() {
  return {
    search: (params: { query?: string; resultsCount?: number }) =>
      send({ event: 'search', ...params }),

    listingView: (params: { listingId: string; title?: string }) =>
      send({ event: 'listing_view', ...params }),

    contact: (params: { listingId: string; channel?: string }) =>
      send({ event: 'contact', ...params }),

    payment: (params: { amount?: number; currency?: string; method?: string }) =>
      send({ event: 'payment', ...params }),

    signUp: (params: { role?: string }) =>
      send({ event: 'sign_up', ...params }),
  };
}

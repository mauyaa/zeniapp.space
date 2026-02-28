// Shared price formatting helpers

/**
 * Formats a numeric price for Kenyan market cards (e.g. "KES 25.5M", "KES 120K/mo").
 * Guards against missing/invalid values to avoid "KES NaN".
 */
export function formatKesPrice(price: number | undefined | null, isRental = false): string {
  const numeric = Number(price);
  if (!Number.isFinite(numeric) || numeric < 0) return 'KES —';
  if (isRental) return `KES ${(numeric / 1000).toFixed(0)}K/mo`;
  if (numeric >= 1_000_000) return `KES ${(numeric / 1_000_000).toFixed(1)}M`;
  if (numeric >= 1_000) return `KES ${(numeric / 1_000).toFixed(0)}K`;
  return `KES ${numeric.toLocaleString()}`;
}

/**
 * Generic currency formatter for detail pages; keeps the original currency code/symbol.
 */
export function formatDisplayPrice(amount: number, currency: string, isRent: boolean): string {
  const numeric = Number(amount);
  const sym = currency?.startsWith('KES') || currency === 'KES' ? 'KES' : currency || 'KES';
  if (!Number.isFinite(numeric) || numeric < 0) return `${sym} —`;
  if (isRent) return `${sym} ${(numeric / 1000).toFixed(0)}K/mo`;
  if (numeric >= 1_000_000) return `${sym} ${(numeric / 1_000_000).toFixed(1)}M`;
  if (numeric >= 1_000) return `${sym} ${(numeric / 1_000).toFixed(0)}K`;
  return `${sym} ${numeric.toLocaleString()}`;
}

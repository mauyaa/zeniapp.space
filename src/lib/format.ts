/** Compact price for cards (e.g. KES 25K, KES 1.5M) */
export function formatCompactPrice(price?: number, currency = 'KES') {
  if (price === undefined || price === null) return '--';
  if (price >= 1000000) {
    return `${currency} ${(price / 1000000).toFixed(1)}M`;
  }
  if (price >= 1000) {
    return `${currency} ${(price / 1000).toFixed(0)}K`;
  }
  return `${currency} ${price.toLocaleString()}`;
}

/** Full price with locale (e.g. KES 25,000) - Kenya formatting */
export function formatCurrency(amount: number, currency = 'KES'): string {
  return `${currency} ${amount.toLocaleString('en-KE')}`;
}

/** Kenya phone: normalize to +254 XXX XXX XXX for display */
export function formatPhone(phone: string | undefined | null): string {
  if (phone == null || !phone.trim()) return '--';
  const digits = phone.replace(/\D/g, '');
  if (digits.length >= 9 && (digits.startsWith('254') || digits.startsWith('0'))) {
    const rest = digits.startsWith('254') ? digits.slice(3) : digits.slice(1);
    return `+254 ${rest.slice(0, 3)} ${rest.slice(3, 6)} ${rest.slice(6)}`;
  }
  return phone;
}

/** Max affordable monthly rent given monthly income and max % (e.g. 0.3 = 30%). */
export function maxAffordableRent(monthlyIncome: number, maxFraction = 0.3): number {
  return Math.max(0, Math.floor(monthlyIncome * maxFraction));
}

/** Locale for Kenya (dates and numbers). Use 'en-KE' when available. */
const DEFAULT_LOCALE = 'en-KE';

/** Short date (e.g. 15 Feb 2026) - use everywhere for consistency; respects Kenya locale */
export function formatDate(value: string | Date | undefined | null): string {
  if (value == null) return '--';
  const date = typeof value === 'string' ? new Date(value) : value;
  return date.toLocaleDateString(DEFAULT_LOCALE, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** Date + time for transaction lists; Kenya locale */
export function formatDateTime(value: string | Date | undefined | null): string {
  if (value == null) return '--';
  const date = typeof value === 'string' ? new Date(value) : value;
  return date.toLocaleString(DEFAULT_LOCALE, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

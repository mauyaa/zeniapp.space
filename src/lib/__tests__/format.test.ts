import { describe, it, expect } from 'vitest';
import { formatCompactPrice, formatCurrency, formatDate, formatDateTime } from '../format';

describe('formatCompactPrice', () => {
  it('formats millions correctly', () => {
    expect(formatCompactPrice(1500000, 'KES')).toBe('KES 1.5M');
    expect(formatCompactPrice(2000000)).toBe('KES 2.0M');
  });

  it('formats thousands correctly', () => {
    expect(formatCompactPrice(25000, 'KES')).toBe('KES 25K');
    expect(formatCompactPrice(1000, 'USD')).toBe('USD 1K');
  });

  it('formats small amounts correctly', () => {
    expect(formatCompactPrice(500, 'KES')).toBe('KES 500');
  });

  it('handles undefined/null', () => {
    expect(formatCompactPrice(undefined)).toBe('--');
    expect(formatCompactPrice(null as unknown as number)).toBe('--');
  });

  it('defaults to KES currency', () => {
    expect(formatCompactPrice(50000)).toBe('KES 50K');
  });
});

describe('formatCurrency', () => {
  it('formats with locale separator', () => {
    const result = formatCurrency(25000, 'KES');
    expect(result).toContain('KES');
    expect(result).toContain('25');
  });

  it('defaults to KES', () => {
    const result = formatCurrency(1000);
    expect(result).toContain('KES');
  });
});

describe('formatDate', () => {
  it('formats a date string', () => {
    const result = formatDate('2026-02-15T12:00:00Z');
    expect(result).toContain('Feb');
    expect(result).toContain('2026');
  });

  it('formats a Date object', () => {
    const result = formatDate(new Date(2026, 0, 1));
    expect(result).toContain('Jan');
    expect(result).toContain('2026');
  });

  it('returns -- for null/undefined', () => {
    expect(formatDate(null)).toBe('--');
    expect(formatDate(undefined)).toBe('--');
  });
});

describe('formatDateTime', () => {
  it('includes time in output', () => {
    const result = formatDateTime('2026-02-15T14:30:00Z');
    expect(result).toContain('Feb');
    expect(result).toContain('2026');
    // Should include time portion
    expect(result.length).toBeGreaterThan(10);
  });

  it('returns -- for null/undefined', () => {
    expect(formatDateTime(null)).toBe('--');
    expect(formatDateTime(undefined)).toBe('--');
  });
});

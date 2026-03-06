import { describe, it, expect } from 'vitest';
import { formatKnownContactLabel, resolveUserContactLabel } from '../contactLabels';

describe('formatKnownContactLabel', () => {
  it('returns Zeni Admin for support/admin labels', () => {
    expect(formatKnownContactLabel('Zeni Support')).toBe('Zeni Admin');
    expect(formatKnownContactLabel('Zeni Admin')).toBe('Zeni Admin');
    expect(formatKnownContactLabel('ZEI Admin')).toBe('Zeni Admin');
    expect(formatKnownContactLabel('support')).toBe('Zeni Admin');
    expect(formatKnownContactLabel('admin')).toBe('Zeni Admin');
    expect(formatKnownContactLabel('Customer Support')).toBe('Zeni Admin');
  });

  it('returns Zeni Agent for agent labels', () => {
    expect(formatKnownContactLabel('Zeni Agent')).toBe('Zeni Agent');
    expect(formatKnownContactLabel('Agent')).toBe('Zeni Agent');
    expect(formatKnownContactLabel('Alice')).toBe('Zeni Agent');
    expect(formatKnownContactLabel('Demo Agent')).toBe('Zeni Agent');
  });

  it('returns Zeni Agent for unknown labels (fallback)', () => {
    expect(formatKnownContactLabel('John')).toBe('Zeni Agent');
    expect(formatKnownContactLabel('')).toBe('Zeni Agent');
    expect(formatKnownContactLabel(null)).toBe('Zeni Agent');
    expect(formatKnownContactLabel(undefined)).toBe('Zeni Agent');
  });

  it('handles case insensitively', () => {
    expect(formatKnownContactLabel('ZENI SUPPORT')).toBe('Zeni Admin');
    expect(formatKnownContactLabel('zeni agent')).toBe('Zeni Agent');
  });
});

describe('resolveUserContactLabel', () => {
  it('returns Zeni Admin for support/admin labels', () => {
    expect(resolveUserContactLabel('Zeni Support')).toBe('Zeni Admin');
    expect(resolveUserContactLabel('Zeni Admin')).toBe('Zeni Admin');
    expect(resolveUserContactLabel('support')).toBe('Zeni Admin');
    expect(resolveUserContactLabel('admin')).toBe('Zeni Admin');
  });

  it('returns Zeni Agent for agent labels', () => {
    expect(resolveUserContactLabel('Zeni Agent')).toBe('Zeni Agent');
    expect(resolveUserContactLabel('Agent Alice')).toBe('Zeni Agent');
    expect(resolveUserContactLabel('John')).toBe('Zeni Agent');
  });

  it('handles null and undefined', () => {
    expect(resolveUserContactLabel(null)).toBe('Zeni Agent');
    expect(resolveUserContactLabel(undefined)).toBe('Zeni Agent');
  });
});

import { describe, it, expect } from 'vitest';
import {
  validateEmailOrPhone,
  passwordScore,
  validatePassword,
  validateResetPassword,
} from '../validation';

describe('validateEmailOrPhone', () => {
  it('returns error for empty input', () => {
    expect(validateEmailOrPhone('')).toBe('Email or phone is required');
    expect(validateEmailOrPhone('   ')).toBe('Email or phone is required');
  });

  it('validates correct emails', () => {
    expect(validateEmailOrPhone('user@example.com')).toBeUndefined();
    expect(validateEmailOrPhone('test@domain.co.ke')).toBeUndefined();
  });

  it('rejects invalid emails', () => {
    expect(validateEmailOrPhone('not-an-email@')).toBe('Enter a valid email address');
    expect(validateEmailOrPhone('@domain.com')).toBe('Enter a valid email address');
  });

  it('validates phone numbers (7+ digits)', () => {
    expect(validateEmailOrPhone('0712345678')).toBeUndefined();
    expect(validateEmailOrPhone('+254712345678')).toBeUndefined();
  });

  it('rejects short phone numbers', () => {
    expect(validateEmailOrPhone('12345')).toBe('Enter a valid phone number');
  });
});

describe('passwordScore', () => {
  it('returns 0 for very short passwords', () => {
    expect(passwordScore('ab')).toBe(0);
  });

  it('returns 1 for passwords >= 6 chars', () => {
    expect(passwordScore('abcdef')).toBeGreaterThanOrEqual(1);
  });

  it('returns higher score for mixed case + digits + symbols', () => {
    const score = passwordScore('MyP@ssw0rd!');
    expect(score).toBeGreaterThanOrEqual(4);
  });

  it('maxes at 5', () => {
    expect(passwordScore('VeryStr0ng!Pass')).toBeLessThanOrEqual(5);
  });
});

describe('validatePassword', () => {
  it('returns error for empty password', () => {
    expect(validatePassword('')).toBe('Password is required');
  });

  it('returns error for short password', () => {
    expect(validatePassword('short')).toBe('Use at least 8 characters');
  });

  it('accepts valid password', () => {
    expect(validatePassword('ValidPass1')).toBeUndefined();
    expect(validatePassword('12345678')).toBeUndefined();
  });
});

describe('validateResetPassword', () => {
  it('behaves like validatePassword (min 8 chars)', () => {
    expect(validateResetPassword('')).toBeDefined();
    expect(validateResetPassword('short')).toBeDefined();
    expect(validateResetPassword('eightchr')).toBeUndefined();
  });
});

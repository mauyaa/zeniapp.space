/**
 * Shared client-side validation helpers (align with backend rules where applicable).
 */

export function validateEmailOrPhone(value: string): string | undefined {
  if (!value || !value.trim()) return 'Email or phone is required';
  const trimmed = value.trim();
  if (trimmed.includes('@')) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) ? undefined : 'Enter a valid email address';
  }
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < 7) return 'Enter a valid phone number';
  return undefined;
}

/** Returns 0–5; used for strength UI. */
export function passwordScore(value: string): number {
  let score = 0;
  if (value.length >= 6) score += 1;
  if (value.length >= 10) score += 1;
  if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score += 1;
  if (/\d/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value)) score += 1;
  return score;
}

/** Error message for password (min 8 chars; recommend mix of upper, lower, number). */
export function validatePassword(value: string): string | undefined {
  if (!value) return 'Password is required';
  if (value.length < 8) return 'Use at least 8 characters';
  return undefined;
}

/** For reset password: same as validatePassword (backend requires min 8). */
export function validateResetPassword(value: string): string | undefined {
  return validatePassword(value);
}

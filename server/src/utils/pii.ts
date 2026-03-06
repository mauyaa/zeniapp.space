// Simple PII redaction helper to avoid leaking sensitive fields to external sinks.
// This is intentionally conservative: it masks common fields and patterns.

const DEFAULT_KEYS = [
  'email',
  'phone',
  'phoneNumber',
  'msisdn',
  'password',
  'token',
  'refreshToken',
  'accessToken',
];

const EMAIL_RE = /([A-Za-z0-9._%+-]+)@([A-Za-z0-9.-]+\.[A-Za-z]{2,})/g;
const PHONE_RE = /\b(\+?\d{2,3})?[\s-]?\d{3}[\s-]?\d{3}[\s-]?\d{3,4}\b/g;

export function redactValue(value: unknown): unknown {
  if (typeof value === 'string') {
    let v = value;
    v = v.replace(EMAIL_RE, (_, user, domain) => `${user[0]}***@${domain}`);
    v = v.replace(PHONE_RE, (match) => `${match.slice(0, Math.max(3, match.length - 4))}****`);
    return v;
  }
  return value;
}

export function redactPII<T>(obj: T, extraKeys: string[] = []): T {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map((i) => redactPII(i, extraKeys)) as unknown as T;
  if (typeof obj !== 'object') return redactValue(obj) as T;

  const keys = new Set([...DEFAULT_KEYS, ...extraKeys]);
  if (Array.isArray(obj)) {
    return obj.map((i) => redactPII(i, extraKeys)) as unknown as T;
  }
  const clone: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (keys.has(k)) {
      clone[k] = '[REDACTED]';
      continue;
    }
    clone[k] = redactPII(v, extraKeys);
  }
  return clone as T;
}

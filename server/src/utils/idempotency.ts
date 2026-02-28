import crypto from 'crypto';
export function makeIdempotencyKey(parts: string[]) {
  return crypto.createHash('sha256').update(parts.join(':')).digest('hex');
}


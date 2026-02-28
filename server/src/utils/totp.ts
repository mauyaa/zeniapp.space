import crypto from 'crypto';

function base32encode(buffer: Buffer) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  let output = '';
  buffer.forEach((byte) => {
    bits += byte.toString(2).padStart(8, '0');
  });
  for (let i = 0; i + 5 <= bits.length; i += 5) {
    const chunk = bits.substring(i, i + 5);
    output += alphabet[parseInt(chunk, 2)];
  }
  const padding = (8 - (output.length % 8)) % 8;
  return output + '='.repeat(padding === 8 ? 0 : padding);
}

export function generateSecret(bytes = 20) {
  const buf = crypto.randomBytes(bytes);
  return base32encode(buf);
}

function base32decode(secret: string): Buffer {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const cleaned = secret.replace(/=+$/, '').toUpperCase();
  let bits = '';
  for (const char of cleaned) {
    const idx = alphabet.indexOf(char);
    if (idx === -1) continue;
    bits += idx.toString(2).padStart(5, '0');
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.substring(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

function totpToken(secret: string, timeStep = 30, digits = 6, offset = 0) {
  const counter = Math.floor(Date.now() / 1000 / timeStep) + offset;
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const key = base32decode(secret);
  const hmac = crypto.createHmac('sha1', key).update(buf).digest();
  const offsetBits = hmac[hmac.length - 1] & 0xf;
  const code =
    ((hmac[offsetBits] & 0x7f) << 24) |
    ((hmac[offsetBits + 1] & 0xff) << 16) |
    ((hmac[offsetBits + 2] & 0xff) << 8) |
    (hmac[offsetBits + 3] & 0xff);
  const token = (code % 10 ** digits).toString().padStart(digits, '0');
  return token;
}

export function verifyTOTP(token: string, secret: string, window = 1) {
  for (let errorWindow = -window; errorWindow <= window; errorWindow++) {
    if (totpToken(secret, 30, 6, errorWindow) === token) return true;
  }
  return false;
}

export function keyUri(label: string, issuer: string, secret: string) {
  const encodedLabel = encodeURIComponent(label);
  const encodedIssuer = encodeURIComponent(issuer);
  return `otpauth://totp/${issuer}:${encodedLabel}?secret=${secret}&issuer=${encodedIssuer}`;
}

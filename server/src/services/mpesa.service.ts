/**
 * M-Pesa Daraja API: STK push (Lipa Na M-Pesa Online).
 * Set MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET, MPESA_SHORTCODE, MPESA_PASSKEY, MPESA_CALLBACK_URL
 * for real requests.
 *
 * - In non-production: if unset or placeholder values are used, returns a mock ref (no real push).
 * - In production: M-Pesa is treated as disabled until it is fully configured.
 */
import crypto from 'crypto';
import { logger } from '../utils/logger';
import { env } from '../config/env';

const DARAJA_SANDBOX = 'https://sandbox.safaricom.co.ke';
const DARAJA_PRODUCTION = 'https://api.safaricom.co.ke';
const PLACEHOLDER_VALUES = new Set([
  '',
  'dev',
  'changeme',
  'n/a',
  'na',
  'none',
  'null',
  'undefined',
  '000000',
]);

const isPlaceholder = (value?: string) => {
  const normalized = (value || '').trim().toLowerCase();
  return PLACEHOLDER_VALUES.has(normalized);
};

const isValidCallbackUrl = (value?: string) => {
  if (!value || isPlaceholder(value)) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

const isProd = env.nodeEnv === 'production';
const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1']);

const parseCallbackUrlSafe = (value?: string): URL | null => {
  if (!value) return null;
  try {
    return new URL(value);
  } catch {
    return null;
  }
};

const hasConsumerKey = !isPlaceholder(env.mpesa.consumerKey);
const hasConsumerSecret = !isPlaceholder(env.mpesa.consumerSecret);
const hasShortcode = !isPlaceholder(env.mpesa.shortcode);
const hasPasskey = !isPlaceholder(env.mpesa.passkey);
const hasCallbackSecret = !isPlaceholder(env.mpesa.callbackSecret);

const callbackUrlCandidate = isValidCallbackUrl(env.mpesa.callbackUrl)
  ? parseCallbackUrlSafe(env.mpesa.callbackUrl)
  : null;
const callbackUrlIsLocal = Boolean(
  callbackUrlCandidate && LOCAL_HOSTNAMES.has(callbackUrlCandidate.hostname)
);
const callbackUrlIsHttps = callbackUrlCandidate?.protocol === 'https:';
const hasCallbackUrl = Boolean(
  callbackUrlCandidate && (!isProd || (callbackUrlIsHttps && !callbackUrlIsLocal))
);

const hasCallbackUrlCandidate = Boolean(callbackUrlCandidate && (!isProd || !callbackUrlIsLocal));

const hasAnyConfig =
  hasConsumerKey ||
  hasConsumerSecret ||
  hasShortcode ||
  hasPasskey ||
  hasCallbackUrlCandidate ||
  hasCallbackSecret;
const isLiveConfigured =
  hasConsumerKey && hasConsumerSecret && hasShortcode && hasPasskey && hasCallbackUrl;
const isLiveEnabled = isLiveConfigured && (!isProd || hasCallbackSecret);
const isMockMode = !isLiveConfigured;
let partialConfigWarned = false;
let localCallbackWarned = false;

if (isProd && hasAnyConfig && !isLiveEnabled) {
  const missing: string[] = [];
  if (!hasConsumerKey) missing.push('MPESA_CONSUMER_KEY');
  if (!hasConsumerSecret) missing.push('MPESA_CONSUMER_SECRET');
  if (!hasShortcode) missing.push('MPESA_SHORTCODE');
  if (!hasPasskey) missing.push('MPESA_PASSKEY');
  if (!hasCallbackUrl) missing.push('MPESA_CALLBACK_URL (https, public)');
  if (!hasCallbackSecret) missing.push('MPESA_CALLBACK_SECRET');
  logger.warn('[MPESA] Disabled in production (incomplete configuration).', { missing });
}

export interface StkResult {
  providerRef: string;
}

function getBaseUrl(): string {
  return process.env.NODE_ENV === 'production' ? DARAJA_PRODUCTION : DARAJA_SANDBOX;
}

function parseJsonSafe<T>(text: string): T {
  try {
    return (text ? JSON.parse(text) : {}) as T;
  } catch {
    return {} as T;
  }
}

async function getAccessToken(): Promise<string> {
  const base = getBaseUrl();
  const auth = Buffer.from(`${env.mpesa.consumerKey}:${env.mpesa.consumerSecret}`).toString(
    'base64'
  );
  const res = await fetch(`${base}/oauth/v1/generate?grant_type=client_credentials`, {
    method: 'GET',
    headers: { Authorization: `Basic ${auth}` },
  });
  const text = await res.text();
  const data = parseJsonSafe<{ access_token?: string; errorMessage?: string }>(text);

  if (!res.ok) {
    throw new Error(`M-Pesa OAuth failed: ${res.status} ${data.errorMessage || text}`);
  }

  if (!data.access_token) throw new Error('M-Pesa OAuth: no access_token');
  return data.access_token;
}

/**
 * Initiate STK push. Phone: 254XXXXXXXXX (no +). Amount in KES.
 * Returns providerRef (CheckoutRequestID) to match with callback.
 */
export async function initiateStk(
  _invoiceId: string,
  phone: string,
  amount: number
): Promise<StkResult> {
  const normalizedPhone = phone.replace(/\D/g, '');
  let partyA = '';
  if (/^254\d{9}$/.test(normalizedPhone)) {
    partyA = normalizedPhone;
  } else if (/^0\d{9}$/.test(normalizedPhone)) {
    partyA = `254${normalizedPhone.slice(1)}`;
  } else if (/^\d{9}$/.test(normalizedPhone)) {
    partyA = `254${normalizedPhone}`;
  } else {
    throw Object.assign(new Error('Invalid phone format. Use 07XXXXXXXX or 2547XXXXXXXX'), {
      status: 400,
      code: 'INVALID_PHONE',
    });
  }

  if (isProd && !isLiveEnabled) {
    throw Object.assign(new Error('M-Pesa is not configured on this server'), {
      status: 503,
      code: 'MPESA_DISABLED',
      details: {
        required: [
          'MPESA_CONSUMER_KEY',
          'MPESA_CONSUMER_SECRET',
          'MPESA_SHORTCODE',
          'MPESA_PASSKEY',
          'MPESA_CALLBACK_URL (https, public)',
          'MPESA_CALLBACK_SECRET',
        ],
      },
    });
  }

  if (isMockMode) {
    if (hasAnyConfig && !isLiveConfigured && !partialConfigWarned) {
      partialConfigWarned = true;
      logger.info(
        '[MPESA MOCK] Partial config detected. Set MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET, MPESA_SHORTCODE, MPESA_PASSKEY and MPESA_CALLBACK_URL for live STK.'
      );
    }
    logger.info('[MPESA MOCK] Initiate STK to', partyA, 'amount', amount);
    return { providerRef: `MOCK-${Date.now()}` };
  }

  if (!localCallbackWarned) {
    try {
      const callbackUrl = new URL(env.mpesa.callbackUrl);
      if (['localhost', '127.0.0.1', '::1'].includes(callbackUrl.hostname)) {
        localCallbackWarned = true;
        logger.info(
          '[MPESA] MPESA_CALLBACK_URL points to localhost; provider callbacks will not reach your machine without a tunnel (ngrok/cloudflared).'
        );
      }
    } catch {
      // URL validity already checked in config phase.
    }
  }

  const base = getBaseUrl();
  const token = await getAccessToken();
  const shortcode = env.mpesa.shortcode;
  const passkey = env.mpesa.passkey;
  const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
  const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');

  const body = {
    BusinessShortCode: shortcode,
    Password: password,
    Timestamp: timestamp,
    TransactionType: 'CustomerPayBillOnline',
    Amount: Math.round(amount),
    PartyA: partyA,
    PartyB: shortcode,
    PhoneNumber: partyA,
    CallBackURL: env.mpesa.callbackUrl,
    AccountReference: _invoiceId.slice(0, 12),
    TransactionDesc: 'Zeni payment',
  };

  const res = await fetch(`${base}/mpesa/stkpush/v1/processrequest`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  const data = parseJsonSafe<{
    CheckoutRequestID?: string;
    ResponseCode?: string;
    ResponseDescription?: string;
    errorCode?: string;
    errorMessage?: string;
  }>(text);

  if (!res.ok || data.errorCode) {
    const msg = data.errorMessage || data.ResponseDescription || 'M-Pesa STK push failed';
    logger.error('[MPESA] STK push failed', data);
    throw Object.assign(new Error(msg), { status: 502, code: 'MPESA_STK_FAILED' });
  }

  const checkoutRequestId = data.CheckoutRequestID;
  if (!checkoutRequestId) {
    throw Object.assign(new Error(data.ResponseDescription || 'No CheckoutRequestID'), {
      status: 502,
      code: 'MPESA_STK_FAILED',
    });
  }

  logger.info('[MPESA] STK push initiated', {
    checkoutRequestId,
    partyA: partyA.slice(-4),
    amount,
  });
  return { providerRef: checkoutRequestId };
}

export function verifyCallbackSignature(signature?: string): boolean {
  const secret = env.mpesa.callbackSecret;
  if (!secret || isPlaceholder(secret)) {
    // Never allow unauthenticated callbacks in production.
    return !isProd;
  }
  if (!signature) return false;

  const expected = Buffer.from(secret);
  const received = Buffer.from(signature);
  if (expected.length !== received.length) return false;

  return crypto.timingSafeEqual(expected, received);
}

export function isMpesaCallbackSecretConfigured(): boolean {
  return hasCallbackSecret;
}

import dotenv from 'dotenv';
dotenv.config();

const nodeEnv = process.env.NODE_ENV || 'development';

const parseCsv = (v?: string) =>
  (v || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

const parseNumber = (v: string | undefined, fallback: number) => {
  const num = Number(v);
  return Number.isFinite(num) ? num : fallback;
};

const parseBoolean = (v: string | undefined, fallback = false) => {
  if (v === undefined) return fallback;
  const normalized = v.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
};

const parseTrustProxy = (v?: string): boolean | number | string => {
  if (!v) return false;
  const normalized = v.trim().toLowerCase();
  if (!normalized || normalized === 'false' || normalized === 'off' || normalized === '0')
    return false;
  if (normalized === 'true' || normalized === 'on' || normalized === '1') return true;
  const asNumber = Number(normalized);
  if (Number.isInteger(asNumber) && asNumber >= 0) return asNumber;
  return v;
};

export const env = {
  port: parseNumber(process.env.PORT, 4000),
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/zeni',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret',
  // Default to common Vite dev / preview ports; override in CORS_ORIGIN (comma-separated)
  corsOrigin:
    process.env.CORS_ORIGIN ||
    'http://localhost:5173,http://localhost:4173,http://localhost:5175,capacitor://localhost',
  nodeEnv,
  enableCrons: parseBoolean(process.env.ENABLE_CRONS, nodeEnv === 'production'),
  trustProxy: parseTrustProxy(process.env.TRUST_PROXY),
  // Allow any domain for admins in development unless explicitly locked down via ADMIN_DOMAIN
  adminDomains: parseCsv(process.env.ADMIN_DOMAIN || '*'),
  adminDomain: parseCsv(process.env.ADMIN_DOMAIN || '*')[0] || '*',
  allowPrivilegedSignup: process.env.ALLOW_PRIVILEGED_SIGNUP === 'true',
  adminOtp: process.env.ADMIN_OTP || '',
  adminIpAllowlist: parseCsv(process.env.ADMIN_IP_ALLOWLIST),
  adminRequireTailnet: parseBoolean(process.env.ADMIN_REQUIRE_TAILNET, false),
  payAdminRequireTailnet: parseBoolean(process.env.PAY_ADMIN_REQUIRE_TAILNET, false),
  tailnetExpectedCidrs: parseCsv(
    process.env.TAILNET_EXPECTED_CIDRS || '100.64.0.0/10,fd7a:115c:a1e0::/48'
  ),
  adminStepUpCode: process.env.ADMIN_STEP_UP_CODE || '',
  payStepUpCode: process.env.PAY_STEP_UP_CODE || '',
  publicFeedKey: process.env.PUBLIC_FEED_KEY || 'public-demo-key',
  auditTtlDays: parseNumber(process.env.AUDIT_TTL_DAYS, 180),
  messageRetentionDays: parseNumber(process.env.MESSAGE_RETENTION_DAYS, 730),
  payTxMaxPerHour: parseNumber(process.env.PAY_TX_MAX_PER_HOUR, 10),
  payTxMaxAmountDay: parseNumber(process.env.PAY_TX_MAX_AMOUNT_DAY, 250000),
  payDualControlAmount: parseNumber(process.env.PAY_DUAL_CONTROL_AMOUNT, 50000),
  payStaleMinutes: parseNumber(process.env.PAY_STALE_MINUTES, 30),
  /** Viewing fee in KES (Zeni holds until agent completes + tenant confirms). */
  viewingFeeAmount: parseNumber(process.env.VIEWING_FEE_AMOUNT, 500),
  auditWebhookUrl: process.env.AUDIT_WEBHOOK_URL || '',
  eventWebhookUrl: process.env.EVENT_WEBHOOK_URL || '',
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  /** Emails for welcome chats: Zeni Support, Zeni Agent, Zeni Admin. Must exist in DB (e.g. via seed). */
  zeniSupportEmail: process.env.ZENI_SUPPORT_EMAIL || 'support@zeni.test',
  zeniAgentEmail: process.env.ZENI_AGENT_EMAIL || 'zeniagent.ke@gmail.com',
  zeniAdminEmail: process.env.ZENI_ADMIN_EMAIL || 'admin@zeni.test',
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
  },
  mpesa: {
    consumerKey: process.env.MPESA_CONSUMER_KEY || 'dev',
    consumerSecret: process.env.MPESA_CONSUMER_SECRET || 'dev',
    shortcode: process.env.MPESA_SHORTCODE || '000000',
    passkey: process.env.MPESA_PASSKEY || 'dev',
    callbackUrl: process.env.MPESA_CALLBACK_URL || 'http://localhost:4000/api/pay/mpesa/callback',
    callbackSecret: process.env.MPESA_CALLBACK_SECRET || '',
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  },
  resendApiKey: process.env.RESEND_API_KEY || '',
  resendFrom: process.env.RESEND_FROM || 'onboarding@resend.dev',
};

Object.defineProperty(env, 'mongoUri', {
  enumerable: true,
  configurable: true,
  get() {
    return process.env.MONGO_URI || 'mongodb://localhost:27017/zeni';
  },
});

const isPositiveNumber = (value: number) => Number.isFinite(value) && value > 0;

export function validateRuntimeEnv() {
  const errors: string[] = [];

  if (!Number.isInteger(env.port) || env.port < 1 || env.port > 65535) {
    errors.push('PORT must be an integer between 1 and 65535.');
  }
  if (!isPositiveNumber(env.auditTtlDays)) {
    errors.push('AUDIT_TTL_DAYS must be a positive number.');
  }
  if (!isPositiveNumber(env.payTxMaxPerHour)) {
    errors.push('PAY_TX_MAX_PER_HOUR must be a positive number.');
  }
  if (!isPositiveNumber(env.payTxMaxAmountDay)) {
    errors.push('PAY_TX_MAX_AMOUNT_DAY must be a positive number.');
  }
  if (!isPositiveNumber(env.payDualControlAmount)) {
    errors.push('PAY_DUAL_CONTROL_AMOUNT must be a positive number.');
  }
  if (!isPositiveNumber(env.payStaleMinutes)) {
    errors.push('PAY_STALE_MINUTES must be a positive number.');
  }
  if ((env.adminRequireTailnet || env.payAdminRequireTailnet) && !env.tailnetExpectedCidrs.length) {
    errors.push(
      'TAILNET_EXPECTED_CIDRS must define at least one CIDR when tailnet enforcement is enabled.'
    );
  }

  if (env.nodeEnv === 'production') {
    const explicitMongo = (process.env.MONGO_URI || '').trim();
    const explicitCors = (process.env.CORS_ORIGIN || '').trim();

    if (!explicitMongo) {
      errors.push('MONGO_URI must be explicitly set in production.');
    }
    if (!explicitCors) {
      errors.push('CORS_ORIGIN must be explicitly set in production.');
    }
    if (!process.env.JWT_SECRET || env.jwtSecret === 'dev-secret' || env.jwtSecret.length < 24) {
      errors.push('JWT_SECRET must be set to a strong value (24+ chars) in production.');
    }
    if (!env.adminStepUpCode || env.adminStepUpCode === '000000') {
      errors.push('ADMIN_STEP_UP_CODE must be configured to a non-default value in production.');
    }
    if (!env.payStepUpCode || env.payStepUpCode === '000000') {
      errors.push('PAY_STEP_UP_CODE must be configured to a non-default value in production.');
    }
    if (env.adminDomains.includes('*')) {
      errors.push('ADMIN_DOMAIN cannot be "*" in production.');
    }
  }

  if (errors.length) {
    throw new Error(`[env] invalid configuration\n- ${errors.join('\n- ')}`);
  }
}

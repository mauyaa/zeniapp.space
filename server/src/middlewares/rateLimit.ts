import rateLimit from 'express-rate-limit';
import { recordRateLimit } from '../services/rateMetrics';
import { env } from '../config/env';

type LimiterOptions = Partial<Parameters<typeof rateLimit>[0]>;

function limiter(name: string, windowMs: number, max: number, options: LimiterOptions = {}) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    ...options,
    handler: (req, res) => {
      recordRateLimit(name);
      const isAuth = ['auth_login', 'auth_refresh', 'pay_login', 'pay_refresh'].includes(name);
      const message = isAuth
        ? 'Too many authentication attempts. Please try again in a few minutes.'
        : 'Too many requests. Please try again later.';
      res.status(429).json({ code: 'RATE_LIMITED', message });
    },
  });
}

/** Login/register/forgot: 35 attempts per 15 min (was 20) to reduce "too many requests" during normal use */
const isProduction = env.nodeEnv === 'production';

export const loginLimiter = limiter('auth_login', 15 * 60 * 1000, isProduction ? 35 : 500, {
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    const identifier =
      typeof req.body?.emailOrPhone === 'string' ? req.body.emailOrPhone.trim().toLowerCase() : '';
    const ip = req.ip || 'unknown';
    return identifier ? `${ip}:${identifier}` : ip;
  },
});
export const refreshLimiter = limiter('auth_refresh', 15 * 60 * 1000, isProduction ? 300 : 5000);
export const sendLimiter = limiter('send_generic', 60 * 1000, isProduction ? 120 : 5000);
export const payLimiter = limiter('pay_stk', 5 * 60 * 1000, 10);
export const adminLimiter = limiter('admin_api', 60 * 1000, 40);
export const payLoginLimiter = limiter('pay_login', 15 * 60 * 1000, isProduction ? 10 : 300, {
  skipSuccessfulRequests: true,
});
export const payRefreshLimiter = limiter('pay_refresh', 15 * 60 * 1000, isProduction ? 60 : 500);
export const payInitiateLimiter = limiter('pay_initiate', 5 * 60 * 1000, 10);
export const payAdminLimiter = limiter('pay_admin', 60 * 1000, 30);
export const reportLimiter = limiter('reports', 15 * 60 * 1000, 15);

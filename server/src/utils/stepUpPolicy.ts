import { env } from '../config/env';

/**
 * Local development may accept a non-empty step-up code only when no static
 * code is configured. Staging and production always fail closed.
 */
export function shouldAcceptLooseAdminStepUp(
  normalizedCode: string,
  configuredStaticCode: string
): boolean {
  if (!normalizedCode) return false;
  if (env.nodeEnv === 'test') return !configuredStaticCode;
  return env.nodeEnv === 'development' && !configuredStaticCode;
}

/** Same rules as admin; uses PAY_STEP_UP_CODE as the configured secret. */
export function shouldAcceptLoosePayStepUp(code: string, configuredPayCode: string): boolean {
  if (!code || code.trim().length === 0) return false;
  if (env.nodeEnv === 'test') return !configuredPayCode;
  return env.nodeEnv === 'development' && !configuredPayCode;
}

export function describeAdminStepUpPolicyForLog(): string {
  if (env.nodeEnv === 'production' || env.nodeEnv === 'staging') {
    return 'strict - MFA or ADMIN_STEP_UP_CODE / ADMIN_OTP (case-insensitive).';
  }
  if (env.nodeEnv === 'test') {
    return 'test - strict when ADMIN_STEP_UP_CODE or ADMIN_OTP is set.';
  }
  return 'development - loose only when no static step-up code is configured.';
}

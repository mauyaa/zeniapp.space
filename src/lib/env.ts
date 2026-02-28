/**
 * Frontend environment validation. Ensures required VITE_* vars are present in production.
 */

import { logger } from './logger';

const requiredInProduction = ['VITE_API_BASE_URL'] as const;

export interface EnvConfig {
  VITE_API_BASE_URL: string;
  VITE_DEV_API_TARGET: string;
  VITE_SOCKET_URL: string | undefined;
  VITE_MOBILE_API_BASE_URL?: string;
  VITE_MOBILE_SOCKET_URL?: string;
}

function getEnv(key: string): string | undefined {
  return (import.meta.env[key] as string | undefined)?.trim() || undefined;
}

/**
 * Validates env and returns config. In production, logs a warning if required vars are missing.
 */
export function getEnvConfig(): EnvConfig {
  const isProd = import.meta.env.PROD;
  const missing: string[] = [];

  if (isProd) {
    for (const key of requiredInProduction) {
      if (!getEnv(key)) missing.push(key);
    }
    if (missing.length > 0) {
      logger.warn(`[env] Recommended in production: set ${missing.join(', ')} in your environment or .env. Using defaults for now.`);
    }
  }

  return {
    VITE_API_BASE_URL: getEnv('VITE_API_BASE_URL') || '/api',
    VITE_DEV_API_TARGET: getEnv('VITE_DEV_API_TARGET') || 'http://localhost:4000',
    VITE_SOCKET_URL: getEnv('VITE_SOCKET_URL'),
    VITE_MOBILE_API_BASE_URL: getEnv('VITE_MOBILE_API_BASE_URL'),
    VITE_MOBILE_SOCKET_URL: getEnv('VITE_MOBILE_SOCKET_URL'),
  };
}

/** Call once at app boot (e.g. in main.tsx). Ensures config is loaded; in production warns if recommended vars are missing. */
export function validateEnv(): void {
  getEnvConfig();
}

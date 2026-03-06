import { env } from '../config/env';

const shouldLogInTest =
  process.env.LOG_IN_TEST === 'true' || process.env.REQUEST_LOG_IN_TEST === 'true';
const muteLogs = env.nodeEnv === 'test' && !shouldLogInTest;

export const logger = {
  info: (...args: unknown[]) => {
    if (muteLogs) return;
    console.log('[INFO]', ...args);
  },
  warn: (...args: unknown[]) => {
    if (muteLogs) return;
    console.warn('[WARN]', ...args);
  },
  error: (...args: unknown[]) => {
    if (muteLogs) return;
    console.error('[ERROR]', ...args);
  },
};

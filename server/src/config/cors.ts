import { env } from './env';

export const corsOrigins = (env.corsOrigin || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

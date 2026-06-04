import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';

interface RequestWithId extends Request {
  requestId?: string;
}

function redactUrl(originalUrl: string) {
  try {
    const parsed = new URL(originalUrl, 'http://local');
    for (const key of ['token', 'secret', 'code', 'credential', 'signature']) {
      if (parsed.searchParams.has(key)) parsed.searchParams.set(key, '[REDACTED]');
    }
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return originalUrl.split('?')[0];
  }
}

export function requestLogger(req: RequestWithId, res: Response, next: NextFunction) {
  const start = Date.now();
  const id = req.requestId || 'n/a';
  res.on('finish', () => {
    if (env.nodeEnv === 'test' && process.env.REQUEST_LOG_IN_TEST !== 'true') return;
    const ms = Date.now() - start;
    console.log(
      JSON.stringify({
        id,
        method: req.method,
        url: redactUrl(req.originalUrl),
        status: res.statusCode,
        ms,
      })
    );
  });
  next();
}

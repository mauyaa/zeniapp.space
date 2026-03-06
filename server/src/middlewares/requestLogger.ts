import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';

interface RequestWithId extends Request {
  requestId?: string;
}

export function requestLogger(req: RequestWithId, res: Response, next: NextFunction) {
  const start = Date.now();
  const id = req.requestId || 'n/a';
  res.on('finish', () => {
    if (env.nodeEnv === 'test' && process.env.REQUEST_LOG_IN_TEST !== 'true') return;
    const ms = Date.now() - start;
    console.log(
      JSON.stringify({ id, method: req.method, url: req.originalUrl, status: res.statusCode, ms })
    );
  });
  next();
}

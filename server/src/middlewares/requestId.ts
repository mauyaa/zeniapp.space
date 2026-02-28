import { randomUUID } from 'crypto';
import { Request, Response, NextFunction } from 'express';

type RequestWithId = Request & { requestId?: string };

export function requestId(req: RequestWithId, res: Response, next: NextFunction) {
  const incoming = req.header('x-request-id');
  const id = incoming && typeof incoming === 'string' ? incoming : randomUUID();
  req.requestId = id;
  res.setHeader('x-request-id', id);
  next();
}

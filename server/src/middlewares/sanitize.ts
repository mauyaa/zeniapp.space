import { Request, Response, NextFunction } from 'express';

function stripMongoOperators(obj: unknown): void {
  if (!obj || typeof obj !== 'object') return;
  const record = obj as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (key.startsWith('$') || key.includes('.')) {
      delete record[key];
    } else {
      stripMongoOperators(record[key]);
    }
  }
}

export function sanitize(req: Request, _res: Response, next: NextFunction) {
  stripMongoOperators(req.body);
  stripMongoOperators(req.query);
  next();
}


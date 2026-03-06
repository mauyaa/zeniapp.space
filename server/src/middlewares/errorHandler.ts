/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextFunction, Request, Response, RequestHandler } from 'express';
import { ZodError } from 'zod';

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  // Handle Zod validation errors
  if (err instanceof ZodError) {
    return res.status(400).json({
      code: 'VALIDATION_ERROR',
      message: 'Invalid request data',
      details: err.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
      })),
    });
  }

  const appErr = err as {
    status?: number;
    code?: string;
    message?: string;
    details?: unknown;
    stack?: string;
  };
  const status = appErr?.status || 500;
  const code = appErr?.code || 'SERVER_ERROR';
  const message = appErr?.message || 'Internal error';
  const details = appErr?.details;

  if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
    console.error('[Error]', {
      code,
      message,
      stack: appErr?.stack,
    });
  }

  res.status(status).json({ code, message, details });
}

/**
 * Wraps an async route handler to catch errors and pass them to error middleware
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

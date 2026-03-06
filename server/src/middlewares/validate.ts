import { AnyZodObject } from 'zod';
import { Request, Response, NextFunction } from 'express';

export function validate(schema: AnyZodObject) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse({ body: req.body, params: req.params, query: req.query });
    if (!result.success) {
      return res
        .status(400)
        .json({
          code: 'VALIDATION_ERROR',
          message: 'Invalid input',
          details: result.error.flatten(),
        });
    }
    req.body = result.data.body;
    req.params = result.data.params;
    req.query = result.data.query;
    next();
  };
}

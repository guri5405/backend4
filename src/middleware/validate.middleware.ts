import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { ApiError } from '../utils/ApiError';


export const validate =
  (schema: ZodSchema) =>
  (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      }));
      return next(ApiError.badRequest('Validation failed', details));
    }

    const parsed = result.data as Record<string, unknown>;
    if (parsed.body) req.body = parsed.body;
    if (parsed.query) req.query = parsed.query as typeof req.query;
    if (parsed.params) req.params = parsed.params as typeof req.params;

    next();
  };

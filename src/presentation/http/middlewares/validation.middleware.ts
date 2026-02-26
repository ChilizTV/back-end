import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { ValidationError } from '../../../domain/shared/errors/ValidationError';

/**
 * Validation middleware factory - validates req.body, req.params, req.query against Zod schema
 */
export function validate(schema: AnyZodObject) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validated = await schema.parseAsync({
        body: req.body,
        params: req.params,
        query: req.query,
      });

      // Replace with validated data (applies defaults, coercions, transformations)
      if (validated.body !== undefined) req.body = validated.body;
      if (validated.params !== undefined) req.params = validated.params;
      if (validated.query !== undefined) req.query = validated.query;

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(new ValidationError('Invalid request data', error.errors));
      } else {
        next(error);
      }
    }
  };
}

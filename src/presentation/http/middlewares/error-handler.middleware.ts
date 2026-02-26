import { Request, Response, NextFunction } from 'express';
import { DomainError } from '../../../domain/shared/errors/DomainError';
import { ZodError } from 'zod';
import { logger } from '../../../infrastructure/logging/logger';

/**
 * Global error handler middleware
 *
 * Catches all errors thrown in the application and formats them consistently:
 * - DomainError instances: Returns structured error with proper status code
 * - ZodError instances: Formats validation errors from Zod schemas
 * - Unknown errors: Returns generic 500 error (hides internal details)
 *
 * IMPORTANT: This middleware MUST be added AFTER all routes in index.ts
 */
export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Extract correlation ID if present (for tracing across services)
  const correlationId = req.headers['x-correlation-id'] as string;

  // Handle domain errors (ValidationError, NotFoundError, etc.)
  if (error instanceof DomainError) {
    logger.warn('Domain error', {
      correlationId,
      error: error.toJSON(),
      path: req.path,
      method: req.method,
    });

    res.status(error.statusCode).json({
      success: false,
      error: error.toJSON(),
      ...(correlationId ? { correlationId } : {}),
    });
    return;
  }

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    logger.warn('Validation error', {
      correlationId,
      errors: error.errors,
      path: req.path,
    });

    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details: error.errors,
      },
      ...(correlationId ? { correlationId } : {}),
    });
    return;
  }

  // Handle unknown errors (don't leak internal details)
  logger.error('Unhandled error', {
    correlationId,
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
  });

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
    },
    ...(correlationId && { correlationId }),
  });
}

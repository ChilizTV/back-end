import { DomainError } from './DomainError';

/**
 * Validation error - thrown when input data is invalid
 *
 * HTTP Status: 400 Bad Request
 *
 * Examples:
 * - Invalid Ethereum address format
 * - Missing required fields
 * - Invalid enum values
 * - Zod schema validation failures
 */
export class ValidationError extends DomainError {
  constructor(message: string, details?: unknown) {
    super(message, 'VALIDATION_ERROR', 400, details);
  }
}

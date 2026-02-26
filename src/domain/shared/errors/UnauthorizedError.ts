import { DomainError } from './DomainError';

/**
 * Unauthorized error - thrown when authentication is missing or invalid
 *
 * HTTP Status: 401 Unauthorized
 *
 * Examples:
 * - Missing JWT token
 * - Invalid JWT token
 * - Expired JWT token
 * - Invalid wallet signature
 */
export class UnauthorizedError extends DomainError {
  constructor(message: string = 'Unauthorized') {
    super(message, 'UNAUTHORIZED', 401);
  }
}

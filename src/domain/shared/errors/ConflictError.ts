import { DomainError } from './DomainError';

/**
 * Conflict error - thrown when operation conflicts with current state
 *
 * HTTP Status: 409 Conflict
 *
 * Examples:
 * - Duplicate prediction for same match
 * - Stream already exists with same key
 * - Match already resolved
 * - Prediction already settled
 */
export class ConflictError extends DomainError {
  constructor(message: string, details?: unknown) {
    super(message, 'CONFLICT', 409, details);
  }
}

import { DomainError } from './DomainError';

/**
 * Not found error - thrown when a requested resource doesn't exist
 *
 * HTTP Status: 404 Not Found
 *
 * Examples:
 * - Match not found by ID
 * - Prediction not found
 * - User not found
 * - Stream not found
 */
export class NotFoundError extends DomainError {
  /**
   * @param resource - Type of resource (e.g., 'Match', 'Prediction', 'User')
   * @param identifier - Unique identifier of the resource (e.g., ID, address)
   */
  constructor(resource: string, identifier: string | number) {
    super(
      `${resource} with identifier '${identifier}' not found`,
      'NOT_FOUND',
      404,
      { resource, identifier }
    );
  }
}

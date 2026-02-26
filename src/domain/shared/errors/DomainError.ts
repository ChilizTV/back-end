/**
 * Base class for all domain errors
 *
 * Provides consistent error structure with:
 * - HTTP status code
 * - Error code (for API clients)
 * - Error message (human-readable)
 * - Optional details (additional context)
 */
export abstract class DomainError extends Error {
  /**
   * @param message - Human-readable error message
   * @param code - Error code for API clients (e.g., 'VALIDATION_ERROR')
   * @param statusCode - HTTP status code (default: 500)
   * @param details - Optional additional context (e.g., Zod validation errors)
   */
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = this.constructor.name;

    // Capture stack trace, excluding constructor call from it
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Serialize error to JSON format for API responses
   */
  toJSON() {
    return {
      code: this.code,
      message: this.message,
      ...(this.details ? { details: this.details } : {}),
    };
  }
}

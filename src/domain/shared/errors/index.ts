/**
 * Barrel export for domain errors
 *
 * Allows clean imports: import { ValidationError, NotFoundError } from '@/domain/shared/errors';
 */
export { DomainError } from './DomainError';
export { ValidationError } from './ValidationError';
export { NotFoundError } from './NotFoundError';
export { UnauthorizedError } from './UnauthorizedError';
export { ConflictError } from './ConflictError';

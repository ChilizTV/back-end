import { z } from 'zod';

/**
 * Common reusable Zod schemas
 *
 * These schemas are used across multiple endpoints for consistent validation
 */

/**
 * Ethereum address schema (0x + 40 hex characters)
 * Example: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb2
 */
export const ethereumAddressSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address format');

/**
 * Transaction hash schema (0x + 64 hex characters)
 * Example: 0x1234567890abcdef...
 */
export const transactionHashSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{64}$/, 'Invalid transaction hash format');

/**
 * UUID schema (v4)
 * Example: 123e4567-e89b-12d3-a456-426614174000
 */
export const uuidSchema = z.string().uuid('Invalid UUID format');

/**
 * Pagination schema (limit + offset)
 * Used in GET endpoints for paginated results
 */
export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

/**
 * Positive integer schema
 * Used for IDs, counts, etc.
 */
export const positiveIntSchema = z.number().int().positive();

/**
 * Non-empty string schema (trimmed)
 * Used for names, descriptions, etc.
 */
export const nonEmptyStringSchema = z.string().min(1).trim();

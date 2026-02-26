import { z } from 'zod';
import { ethereumAddressSchema, uuidSchema } from './common.schemas';

/**
 * Stream schemas for /stream endpoints
 */

/**
 * Stream status enum
 */
export const streamStatusSchema = z.enum([
  'PENDING',
  'LIVE',
  'ENDED',
  'FAILED',
]);

/**
 * Schema for POST /stream/create
 *
 * Creates a new stream
 */
export const createStreamSchema = z.object({
  body: z.object({
    userId: uuidSchema,
    walletAddress: ethereumAddressSchema,
    title: z.string().min(1).max(200).trim(),
    description: z.string().max(1000).trim().optional(),
    streamKey: z.string().min(10).max(100),
    matchId: z.number().int().positive().optional(),
    isMatchStream: z.boolean().default(false),
  }),
});

/**
 * Schema for POST /stream/:streamId/start
 *
 * Starts a stream
 */
export const startStreamSchema = z.object({
  params: z.object({
    streamId: uuidSchema,
  }),
});

/**
 * Schema for POST /stream/:streamId/end
 *
 * Ends a stream
 */
export const endStreamSchema = z.object({
  params: z.object({
    streamId: uuidSchema,
  }),
});

/**
 * Schema for GET /stream/:streamId
 *
 * Retrieves stream details
 */
export const getStreamByIdSchema = z.object({
  params: z.object({
    streamId: uuidSchema,
  }),
});

/**
 * Schema for GET /stream/user/:userId
 *
 * Retrieves streams for a specific user
 */
export const getUserStreamsSchema = z.object({
  params: z.object({
    userId: uuidSchema,
  }),
  query: z.object({
    status: streamStatusSchema.optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    offset: z.coerce.number().int().min(0).default(0),
  }),
});

/**
 * Schema for DELETE /stream/:streamId
 *
 * Deletes a stream
 */
export const deleteStreamSchema = z.object({
  params: z.object({
    streamId: uuidSchema,
  }),
});

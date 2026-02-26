import { z } from 'zod';
import {
  ethereumAddressSchema,
  transactionHashSchema,
  uuidSchema,
  paginationSchema,
} from './common.schemas';

/**
 * Prediction schemas for /predictions endpoints
 */

/**
 * Prediction type enum
 */
export const predictionTypeSchema = z.enum([
  'WIN_HOME',
  'WIN_AWAY',
  'DRAW',
  'OVER',
  'UNDER',
]);

/**
 * Prediction status enum
 */
export const predictionStatusSchema = z.enum([
  'PENDING',
  'IN_PROGRESS',
  'WON',
  'LOST',
  'CANCELLED',
]);

/**
 * Schema for POST /predictions (create prediction)
 *
 * Validates prediction creation from blockchain transaction
 */
export const createPredictionSchema = z.object({
  body: z.object({
    userId: uuidSchema,
    walletAddress: ethereumAddressSchema,
    username: z.string().min(1).max(50).trim(),
    matchId: z.number().int().positive(),
    matchName: z.string().min(1).max(200).trim(),
    predictionType: predictionTypeSchema,
    predictionValue: z.string().min(1).max(50),
    predictedTeam: z.string().min(1).max(100).trim(),
    odds: z.number().positive().max(100),
    transactionHash: transactionHashSchema,
    matchStartTime: z.coerce.date().refine(
      (date) => date > new Date(),
      'Match start time must be in the future'
    ),
  }),
});

/**
 * Schema for GET /predictions/:userId
 *
 * Retrieves predictions for a specific user with optional filtering
 */
export const getUserPredictionsSchema = z.object({
  params: z.object({
    userId: uuidSchema,
  }),
  query: paginationSchema.extend({
    status: predictionStatusSchema.optional(),
  }),
});

/**
 * Schema for GET /predictions/:predictionId
 *
 * Retrieves a single prediction by ID
 */
export const getPredictionByIdSchema = z.object({
  params: z.object({
    predictionId: uuidSchema,
  }),
});

/**
 * Schema for GET /predictions/stats/:userId
 *
 * Retrieves prediction stats for a user
 */
export const getUserStatsSchema = z.object({
  params: z.object({
    userId: uuidSchema,
  }),
  query: z.object({}),
});

/**
 * Schema for PATCH /predictions/:predictionId/settle
 *
 * Settles a prediction after match result
 */
export const settlePredictionSchema = z.object({
  params: z.object({
    predictionId: uuidSchema,
  }),
  body: z.object({
    finalScore: z.object({
      home: z.number().int().min(0),
      away: z.number().int().min(0),
    }),
    result: z.enum(['WON', 'LOST']),
  }),
});

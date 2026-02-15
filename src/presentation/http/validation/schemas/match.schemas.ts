import { z } from 'zod';
import { ethereumAddressSchema, positiveIntSchema } from './common.schemas';

/**
 * Match schemas for /matches endpoints
 */

/**
 * Match status enum (from API-Football)
 */
export const matchStatusSchema = z.enum([
  'TBD',  // Time To Be Defined
  'NS',   // Not Started
  '1H',   // First Half
  'HT',   // Halftime
  '2H',   // Second Half
  'ET',   // Extra Time
  'P',    // Penalty
  'FT',   // Finished
  'AET',  // After Extra Time
  'PEN',  // Penalty Finished
  'BT',   // Break Time
  'SUSP', // Suspended
  'INT',  // Interrupted
  'PST',  // Postponed
  'CANC', // Cancelled
  'ABD',  // Abandoned
  'AWA',  // Technical Loss
  'WO',   // WalkOver
  'LIVE', // Live (generic)
]);

/**
 * Schema for POST /matches/sync
 *
 * Triggers manual sync of matches from API-Football
 */
export const syncMatchesSchema = z.object({
  body: z.object({
    date: z.coerce.date().optional(),
    league: z.number().int().positive().optional(),
    season: z.number().int().min(2020).max(2030).optional(),
  }),
});

/**
 * Schema for GET /matches/:matchId
 *
 * Retrieves a single match by API Football ID
 */
export const getMatchByIdSchema = z.object({
  params: z.object({
    matchId: positiveIntSchema,
  }),
});

/**
 * Schema for PATCH /matches/:matchId/deploy-contract
 *
 * Deploys betting contract for a match
 */
export const deployBettingContractSchema = z.object({
  params: z.object({
    matchId: positiveIntSchema,
  }),
  body: z.object({
    odds: z.object({
      home: z.number().positive(),
      draw: z.number().positive(),
      away: z.number().positive(),
    }),
  }),
});

/**
 * Schema for PATCH /matches/:matchId/update-odds
 *
 * Updates odds for a match
 */
export const updateMatchOddsSchema = z.object({
  params: z.object({
    matchId: positiveIntSchema,
  }),
  body: z.object({
    odds: z.object({
      home: z.number().positive(),
      draw: z.number().positive(),
      away: z.number().positive(),
    }),
  }),
});

/**
 * Schema for PATCH /matches/:matchId/resolve
 *
 * Resolves a match with final score
 */
export const resolveMatchSchema = z.object({
  params: z.object({
    matchId: positiveIntSchema,
  }),
  body: z.object({
    finalScore: z.object({
      home: z.number().int().min(0),
      away: z.number().int().min(0),
    }),
    status: z.enum(['FT', 'AET', 'PEN']),
    bettingContractAddress: ethereumAddressSchema.optional(),
  }),
});

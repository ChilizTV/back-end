import { z } from 'zod';
import { ethereumAddressSchema } from './common.schemas';

/**
 * Schema for POST /auth/token
 * Generates JWT after verifying access (email OR walletAddress required)
 */
export const generateTokenSchema = z.object({
  body: z
    .object({
      email: z.string().email().optional(),
      walletAddress: ethereumAddressSchema.optional(),
    })
    .refine((data) => data.email || data.walletAddress, {
      message: 'Either email or walletAddress is required',
    }),
});

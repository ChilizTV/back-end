import { env } from './environment';

/**
 * JWT configuration
 */
export const jwtConfig = {
  secret: env.JWT_SECRET,
  issuer: env.JWT_ISSUER,
  expiresIn: env.JWT_EXPIRY,
  algorithm: 'HS256' as const,
};

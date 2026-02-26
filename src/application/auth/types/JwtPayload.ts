/**
 * JWT payload structure
 *
 * Note: No users table - userId comes from Dynamic (Web3 auth provider)
 */
export interface JwtPayload {
  email: string | null;    // User email (optional)
  walletAddress: string;   // Ethereum wallet address
  isWhitelisted: boolean;  // Whitelist status for authorization
  role: string;            // User role (UserRole enum value)
  iat?: number;            // Issued at (timestamp)
  exp?: number;            // Expiration (timestamp)
  iss?: string;            // Issuer
}

/**
 * User roles for authorization
 * Simple role system - can be enriched later with a roles table if needed
 */
export enum UserRole {
  USER = 'USER',           // Default role for all users
  STREAMER = 'STREAMER',   // Can create streams
  ADMIN = 'ADMIN',         // Full access
}

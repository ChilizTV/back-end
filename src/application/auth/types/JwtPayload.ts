/**
 * JWT payload structure
 *
 * Note: No users table - userId comes from Dynamic (Web3 auth provider)
 */
export interface JwtPayload {
  userId: string;          // User ID from Dynamic
  walletAddress: string;   // Ethereum wallet address
  role: UserRole;
  iat?: number;            // Issued at (timestamp)
  exp?: number;            // Expiration (timestamp)
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

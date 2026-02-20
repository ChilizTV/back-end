/**
 * @notice Token balance interface
 */
export interface TokenBalance {
  token: {
    name: string;
    symbol: string;
    address: string;
  };
  balance: number;
}

/**
 * @notice User token balance aggregate
 */
export interface UserTokenBalance {
  walletAddress: string;
  totalBalance: number;
  tokenBalances: TokenBalance[];
  isFeatured: boolean;
}

/**
 * @notice Repository interface for fan token operations
 * @dev Defines contract for reading token balances from blockchain
 */
export interface IFanTokenRepository {
  /**
   * @notice Get all fan token balances for a user
   * @param walletAddress User's wallet address
   * @return Promise resolving to user token balance aggregate
   */
  getUserBalances(walletAddress: string): Promise<UserTokenBalance>;
}

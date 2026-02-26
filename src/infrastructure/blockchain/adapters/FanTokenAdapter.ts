import { injectable } from 'tsyringe';
import { createPublicClient, http, defineChain } from 'viem';
import { chiliz } from 'viem/chains';
import { chilizConfig, networkType } from '../../config/chiliz.config';
import { ERC20_ABI } from '../abis';
import { logger } from '../../logging';
import { IFanTokenRepository, UserTokenBalance } from '../../../domain/fan-tokens/repositories/IFanTokenRepository';

const baseSepolia = defineChain({
  id: 84532,
  name: 'Base Sepolia',
  nativeCurrency: { decimals: 18, name: 'Ether', symbol: 'ETH' },
  rpcUrls: { default: { http: ['https://sepolia.base.org'] } },
  blockExplorers: { default: { name: 'BaseScan', url: 'https://sepolia.basescan.org' } },
  testnet: true,
});

const FEATURED_THRESHOLD = 100;

/**
 * @notice Blockchain adapter for fan token operations
 * @dev Implements IFanTokenRepository using viem to read from blockchain
 */
@injectable()
export class FanTokenAdapter implements IFanTokenRepository {
  private publicClient;

  constructor() {
    const chain = networkType === 'testnet' ? baseSepolia : chiliz;
    this.publicClient = createPublicClient({
      chain,
      transport: http(chilizConfig.rpcUrl)
    });
    logger.info('FanTokenAdapter initialized', { network: networkType, chain: chain.name });
  }

  /**
   * @notice Get token balance for a specific token
   * @param walletAddress User's wallet address
   * @param tokenAddress Token contract address
   * @return Token balance as number
   */
  private async getTokenBalance(walletAddress: string, tokenAddress: string): Promise<number> {
    try {
      logger.debug('Reading token balance from blockchain', { walletAddress, tokenAddress });

      const balance = await this.publicClient.readContract({
        address: tokenAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [walletAddress as `0x${string}`],
      });

      const balanceNumber = Number(balance);
      logger.debug('Token balance read successfully', { tokenAddress, balance: balanceNumber });
      return balanceNumber;
    } catch (error) {
      logger.error('Error reading token balance from blockchain', {
        tokenAddress,
        walletAddress,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return 0;
    }
  }

  /**
   * @notice Get all fan token balances for a user
   * @param walletAddress User's wallet address
   * @return Promise resolving to user token balance aggregate
   */
  async getUserBalances(walletAddress: string): Promise<UserTokenBalance> {
    logger.info('Fetching fan token balances from blockchain', { walletAddress });

    const tokenBalances = [];
    let totalBalance = 0;

    // Fetch balances for all supported tokens from blockchain
    for (const token of chilizConfig.tokens) {
      const balance = await this.getTokenBalance(walletAddress, token.address);

      tokenBalances.push({
        token: {
          name: token.name,
          symbol: token.symbol,
          address: token.address
        },
        balance
      });

      if (balance > 0) {
        totalBalance += balance;
      }
    }

    const isFeatured = totalBalance >= FEATURED_THRESHOLD;

    logger.info('Fan token balances fetched successfully from blockchain', {
      walletAddress,
      totalBalance,
      isFeatured,
      tokensWithBalance: tokenBalances.filter(tb => tb.balance > 0).length
    });

    return {
      walletAddress,
      totalBalance,
      tokenBalances,
      isFeatured
    };
  }
}

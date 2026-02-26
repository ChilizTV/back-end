import { injectable, inject } from 'tsyringe';
import { IFanTokenRepository, UserTokenBalance } from '../../../domain/fan-tokens/repositories/IFanTokenRepository';
import { logger } from '../../../infrastructure/logging';

/**
 * @notice Use case for getting user fan token balances
 * @dev Orchestrates fetching token balances from repository
 */
@injectable()
export class GetUserFanTokenBalancesUseCase {
  constructor(
    @inject('IFanTokenRepository')
    private readonly fanTokenRepository: IFanTokenRepository
  ) {}

  /**
   * @notice Execute the use case
   * @param walletAddress User's wallet address
   * @return Promise resolving to user token balances
   */
  async execute(walletAddress: string): Promise<UserTokenBalance> {
    logger.info('Executing GetUserFanTokenBalancesUseCase', { walletAddress });

    if (!walletAddress) {
      throw new Error('Wallet address is required');
    }

    return await this.fanTokenRepository.getUserBalances(walletAddress);
  }
}

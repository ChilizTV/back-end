import { Request, Response, NextFunction } from 'express';
import { injectable, inject } from 'tsyringe';
import { GetUserFanTokenBalancesUseCase } from '../../../application/fan-tokens/use-cases/GetUserFanTokenBalancesUseCase';

/**
 * @notice Controller for fan token operations
 * @dev Follows Clean Architecture by delegating to use cases
 */
@injectable()
export class FanTokensController {
  constructor(
    @inject(GetUserFanTokenBalancesUseCase)
    private readonly getUserFanTokenBalancesUseCase: GetUserFanTokenBalancesUseCase
  ) {}

  /**
   * @notice Get user fan token balances
   * @dev Reads balances for all supported tokens from blockchain via use case
   */
  async getUserBalances(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { walletAddress } = req.params;

      const userBalance = await this.getUserFanTokenBalancesUseCase.execute(walletAddress);

      res.json({
        success: true,
        balance: userBalance,
      });
    } catch (error) {
      next(error);
    }
  }
}

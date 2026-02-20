import { injectable, inject } from 'tsyringe';
import { IPredictionRepository, UserPredictionStats } from '../../../domain/predictions/repositories/IPredictionRepository';

@injectable()
export class GetUserStatsUseCase {
  constructor(
    @inject('IPredictionRepository')
    private readonly predictionRepository: IPredictionRepository
  ) {}

  async execute(userId: string, walletAddress: string): Promise<UserPredictionStats> {
    const stats = await this.predictionRepository.getUserStats(userId, walletAddress);

    if (!stats) {
      return {
        userId,
        walletAddress,
        totalPredictions: 0,
        totalWins: 0,
        totalLosses: 0,
        activePredictions: 0,
        winRate: 0,
      };
    }

    return stats;
  }
}

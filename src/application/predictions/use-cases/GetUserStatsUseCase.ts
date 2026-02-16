import { injectable, inject } from 'tsyringe';
import { IPredictionRepository, UserPredictionStats } from '../../../domain/predictions/repositories/IPredictionRepository';
import { NotFoundError } from '../../../domain/shared/errors/NotFoundError';

@injectable()
export class GetUserStatsUseCase {
  constructor(
    @inject('IPredictionRepository')
    private readonly predictionRepository: IPredictionRepository
  ) {}

  async execute(userId: string, walletAddress: string): Promise<UserPredictionStats> {
    const stats = await this.predictionRepository.getUserStats(userId, walletAddress);

    if (!stats) {
      throw new NotFoundError('User stats', userId);
    }

    return stats;
  }
}

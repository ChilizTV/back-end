import { injectable, inject } from 'tsyringe';
import { IStreamWalletRepository, StreamerStats } from '../../../domain/stream-wallet/repositories/IStreamWalletRepository';

@injectable()
export class GetStreamerStatsUseCase {
  constructor(
    @inject('IStreamWalletRepository')
    private readonly streamWalletRepository: IStreamWalletRepository
  ) {}

  async execute(streamerAddress: string): Promise<StreamerStats> {
    return await this.streamWalletRepository.getStreamerStats(streamerAddress);
  }
}

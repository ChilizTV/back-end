import { injectable, inject } from 'tsyringe';
import { Subscription } from '../../../domain/stream-wallet/entities/Subscription';
import { IStreamWalletRepository } from '../../../domain/stream-wallet/repositories/IStreamWalletRepository';

@injectable()
export class GetStreamerSubscriptionsUseCase {
  constructor(
    @inject('IStreamWalletRepository')
    private readonly streamWalletRepository: IStreamWalletRepository
  ) {}

  async execute(streamerAddress: string): Promise<Subscription[]> {
    return await this.streamWalletRepository.findSubscriptionsByStreamer(streamerAddress);
  }
}

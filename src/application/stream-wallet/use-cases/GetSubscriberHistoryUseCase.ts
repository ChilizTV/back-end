import { injectable, inject } from 'tsyringe';
import { Subscription } from '../../../domain/stream-wallet/entities';
import { IStreamWalletRepository } from '../../../domain/stream-wallet/repositories';

@injectable()
export class GetSubscriberHistoryUseCase {
  constructor(
    @inject('IStreamWalletRepository')
    private readonly streamWalletRepository: IStreamWalletRepository
  ) {}

  async execute(subscriberAddress: string): Promise<Subscription[]> {
    return await this.streamWalletRepository.findSubscriptionsBySubscriber(subscriberAddress);
  }
}

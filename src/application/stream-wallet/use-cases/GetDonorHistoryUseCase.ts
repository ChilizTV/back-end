import { injectable, inject } from 'tsyringe';
import { Donation } from '../../../domain/stream-wallet/entities/Donation';
import { IStreamWalletRepository } from '../../../domain/stream-wallet/repositories/IStreamWalletRepository';

@injectable()
export class GetDonorHistoryUseCase {
  constructor(
    @inject('IStreamWalletRepository')
    private readonly streamWalletRepository: IStreamWalletRepository
  ) {}

  async execute(donorAddress: string): Promise<Donation[]> {
    return await this.streamWalletRepository.findDonationsByDonor(donorAddress);
  }
}

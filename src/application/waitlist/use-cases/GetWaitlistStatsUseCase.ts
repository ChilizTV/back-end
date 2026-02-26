import { injectable, inject } from 'tsyringe';
import { IWaitlistRepository, WaitlistStats } from '../../../domain/waitlist/repositories/IWaitlistRepository';

@injectable()
export class GetWaitlistStatsUseCase {
  constructor(
    @inject('IWaitlistRepository')
    private readonly waitlistRepository: IWaitlistRepository
  ) {}

  async execute(): Promise<WaitlistStats> {
    return await this.waitlistRepository.getStats();
  }
}

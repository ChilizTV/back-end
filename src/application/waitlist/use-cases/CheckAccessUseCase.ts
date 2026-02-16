import { injectable, inject } from 'tsyringe';
import { IWaitlistRepository } from '../../../domain/waitlist/repositories/IWaitlistRepository';

export interface CheckAccessResult {
  hasAccess: boolean;
  email?: string;
  walletAddress?: string;
}

@injectable()
export class CheckAccessUseCase {
  constructor(
    @inject('IWaitlistRepository')
    private readonly waitlistRepository: IWaitlistRepository
  ) {}

  async execute(email?: string, walletAddress?: string): Promise<CheckAccessResult> {
    if (email) {
      const entry = await this.waitlistRepository.findByEmail(email);
      if (entry && entry.hasAccess()) {
        return {
          hasAccess: true,
          email: entry.getEmail(),
        };
      }
    }

    if (walletAddress) {
      const entry = await this.waitlistRepository.findByWalletAddress(walletAddress);
      if (entry && entry.hasAccess()) {
        return {
          hasAccess: true,
          walletAddress,
        };
      }
    }

    return { hasAccess: false };
  }
}

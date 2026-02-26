import { injectable, inject } from 'tsyringe';
import { WaitlistEntry } from '../../../domain/waitlist/entities/WaitlistEntry';
import { IWaitlistRepository } from '../../../domain/waitlist/repositories/IWaitlistRepository';
import { JoinWaitlistDto } from '../dto/JoinWaitlistDto';
import { ConflictError } from '../../../domain/shared/errors/ConflictError';

@injectable()
export class JoinWaitlistUseCase {
  constructor(
    @inject('IWaitlistRepository')
    private readonly waitlistRepository: IWaitlistRepository
  ) {}

  async execute(dto: JoinWaitlistDto): Promise<WaitlistEntry> {
    const existing = await this.waitlistRepository.findByEmail(dto.email);
    if (existing) {
      throw new ConflictError('Email already in waitlist');
    }

    const entry = WaitlistEntry.create({
      email: dto.email,
      walletAddress: dto.walletAddress,
      source: dto.source,
      hasAccess: false,
    });

    return await this.waitlistRepository.save(entry);
  }
}

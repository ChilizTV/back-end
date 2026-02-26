import { injectable, inject } from 'tsyringe';
import { IFollowRepository } from '../../../domain/follows/repositories/IFollowRepository';

@injectable()
export class UnfollowStreamerUseCase {
  constructor(
    @inject('IFollowRepository')
    private readonly followRepository: IFollowRepository
  ) {}

  async execute(followerId: string, streamerId: string): Promise<void> {
    await this.followRepository.unfollow(followerId, streamerId);
  }
}

import { injectable, inject } from 'tsyringe';
import { IFollowRepository } from '../../../domain/follows/repositories/IFollowRepository';

@injectable()
export class GetIsFollowingUseCase {
  constructor(
    @inject('IFollowRepository')
    private readonly followRepository: IFollowRepository
  ) {}

  async execute(followerId: string, streamerId: string): Promise<boolean> {
    return await this.followRepository.isFollowing(followerId, streamerId);
  }
}

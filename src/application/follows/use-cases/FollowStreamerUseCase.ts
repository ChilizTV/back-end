import { injectable, inject } from 'tsyringe';
import { Follow } from '../../../domain/follows/entities/Follow';
import { IFollowRepository } from '../../../domain/follows/repositories/IFollowRepository';

@injectable()
export class FollowStreamerUseCase {
  constructor(
    @inject('IFollowRepository')
    private readonly followRepository: IFollowRepository
  ) {}

  async execute(props: { followerId: string; streamerId: string; streamerName: string }): Promise<Follow> {
    return await this.followRepository.follow(props);
  }
}

import { injectable, inject } from 'tsyringe';
import { Follow } from '../../../domain/follows/entities';
import { IFollowRepository } from '../../../domain/follows/repositories';

@injectable()
export class GetFollowedStreamersUseCase {
  constructor(
    @inject('IFollowRepository')
    private readonly followRepository: IFollowRepository
  ) {}

  async execute(followerId: string): Promise<Follow[]> {
    return await this.followRepository.getFollowedStreamers(followerId);
  }
}

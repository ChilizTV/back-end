import { injectable, inject } from 'tsyringe';
import { IFollowRepository } from '../../../domain/follows/repositories/IFollowRepository';

@injectable()
export class GetFollowerCountUseCase {
  constructor(
    @inject('IFollowRepository')
    private readonly followRepository: IFollowRepository
  ) {}

  async execute(streamerId: string): Promise<number> {
    return await this.followRepository.getFollowerCount(streamerId);
  }
}

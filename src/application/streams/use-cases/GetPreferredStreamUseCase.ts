import { injectable, inject } from 'tsyringe';
import { Stream } from '../../../domain/streams/entities/Stream';
import { IStreamRepository } from '../../../domain/streams/repositories/IStreamRepository';
import { IFollowRepository } from '../../../domain/follows/repositories/IFollowRepository';

export type PreferredStreamSource = 'followed' | 'top_viewer' | 'none';

export interface PreferredStreamResult {
  stream: Stream | null;
  source: PreferredStreamSource;
}

@injectable()
export class GetPreferredStreamUseCase {
  constructor(
    @inject('IStreamRepository')
    private readonly streamRepository: IStreamRepository,
    @inject('IFollowRepository')
    private readonly followRepository: IFollowRepository,
  ) {}

  async execute(matchId: number, userId?: string): Promise<PreferredStreamResult> {
    const streams = await this.streamRepository.findActiveByMatchIds([matchId]);

    // Exclude user's own stream from auto-selection
    const candidates = userId
      ? streams.filter(s => s.getStreamerId() !== userId)
      : streams;

    if (candidates.length === 0) {
      return { stream: null, source: 'none' };
    }

    if (userId) {
      const follows = await this.followRepository.getFollowedStreamers(userId);
      const followedIds = new Set(follows.map(f => f.toJSON().streamerId));
      const followedStream = candidates.find(s => followedIds.has(s.getStreamerId()));
      if (followedStream) {
        return { stream: followedStream, source: 'followed' };
      }
    }

    // candidates already ordered by viewer_count DESC
    return { stream: candidates[0], source: 'top_viewer' };
  }
}

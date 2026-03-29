import { Request, Response, NextFunction } from 'express';
import { injectable, inject } from 'tsyringe';
import {
  FollowStreamerUseCase,
  UnfollowStreamerUseCase,
  GetIsFollowingUseCase,
  GetFollowerCountUseCase,
  GetFollowedStreamersUseCase,
} from '../../../application/follows/use-cases';

@injectable()
export class FollowController {
  constructor(
    @inject(FollowStreamerUseCase)
    private readonly followStreamerUseCase: FollowStreamerUseCase,
    @inject(UnfollowStreamerUseCase)
    private readonly unfollowStreamerUseCase: UnfollowStreamerUseCase,
    @inject(GetIsFollowingUseCase)
    private readonly getIsFollowingUseCase: GetIsFollowingUseCase,
    @inject(GetFollowerCountUseCase)
    private readonly getFollowerCountUseCase: GetFollowerCountUseCase,
    @inject(GetFollowedStreamersUseCase)
    private readonly getFollowedStreamersUseCase: GetFollowedStreamersUseCase
  ) {}

  async follow(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { followerId, streamerId, streamerName } = req.body;
      const follow = await this.followStreamerUseCase.execute({ followerId, streamerId, streamerName });
      res.status(201).json({ success: true, follow: follow.toJSON() });
    } catch (error) {
      next(error);
    }
  }

  async unfollow(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { followerId, streamerId } = req.body;
      await this.unfollowStreamerUseCase.execute(followerId, streamerId);
      res.json({ success: true, message: 'Unfollowed successfully' });
    } catch (error) {
      next(error);
    }
  }

  async isFollowing(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { followerId, streamerId } = req.query as { followerId: string; streamerId: string };
      const isFollowing = await this.getIsFollowingUseCase.execute(followerId, streamerId);
      res.json({ success: true, isFollowing });
    } catch (error) {
      next(error);
    }
  }

  async getFollowerCount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { streamerId } = req.params;
      const count = await this.getFollowerCountUseCase.execute(streamerId);
      res.json({ success: true, count });
    } catch (error) {
      next(error);
    }
  }

  async getFollowedStreamers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { followerId } = req.params;
      const follows = await this.getFollowedStreamersUseCase.execute(followerId);
      res.json({ success: true, follows: follows.map(f => f.toJSON()) });
    } catch (error) {
      next(error);
    }
  }
}

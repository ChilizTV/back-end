import { Follow } from '../entities/Follow';

export interface IFollowRepository {
  follow(props: { followerId: string; streamerId: string; streamerName: string }): Promise<Follow>;
  unfollow(followerId: string, streamerId: string): Promise<void>;
  isFollowing(followerId: string, streamerId: string): Promise<boolean>;
  getFollowerCount(streamerId: string): Promise<number>;
  getFollowedStreamers(followerId: string): Promise<Follow[]>;
}

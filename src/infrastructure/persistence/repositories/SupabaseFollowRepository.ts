import { injectable } from 'tsyringe';
import { supabaseClient as supabase } from '../../database/supabase/client';
import { Follow } from '../../../domain/follows/entities/Follow';
import { IFollowRepository } from '../../../domain/follows/repositories/IFollowRepository';
import { logger } from '../../logging/logger';

interface FollowRow {
  id: string;
  follower_id: string;
  streamer_id: string;
  streamer_name: string;
  created_at: string;
}

@injectable()
export class SupabaseFollowRepository implements IFollowRepository {
  async follow(props: { followerId: string; streamerId: string; streamerName: string }): Promise<Follow> {
    const { data, error } = await supabase
      .from('streamer_follows')
      .upsert(
        {
          follower_id: props.followerId,
          streamer_id: props.streamerId,
          streamer_name: props.streamerName,
        },
        { onConflict: 'follower_id,streamer_id' }
      )
      .select()
      .single();

    if (error) {
      logger.error('Failed to follow streamer', { error: error.message });
      throw new Error('Failed to follow streamer');
    }

    return this.toDomain(data);
  }

  async unfollow(followerId: string, streamerId: string): Promise<void> {
    const { error } = await supabase
      .from('streamer_follows')
      .delete()
      .match({ follower_id: followerId, streamer_id: streamerId });

    if (error) {
      logger.error('Failed to unfollow streamer', { error: error.message });
      throw new Error('Failed to unfollow streamer');
    }
  }

  async isFollowing(followerId: string, streamerId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('streamer_follows')
      .select('id')
      .match({ follower_id: followerId, streamer_id: streamerId })
      .maybeSingle();

    if (error) {
      logger.error('Failed to check follow status', { error: error.message });
      throw new Error('Failed to check follow status');
    }

    return data !== null;
  }

  async getFollowerCount(streamerId: string): Promise<number> {
    const { count, error } = await supabase
      .from('streamer_follows')
      .select('id', { count: 'exact', head: true })
      .eq('streamer_id', streamerId);

    if (error) {
      logger.error('Failed to get follower count', { error: error.message });
      throw new Error('Failed to get follower count');
    }

    return count ?? 0;
  }

  async getFollowedStreamers(followerId: string): Promise<Follow[]> {
    const { data: rows, error } = await supabase
      .from('streamer_follows')
      .select('*')
      .eq('follower_id', followerId)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Failed to get followed streamers', { error: error.message });
      throw new Error('Failed to get followed streamers');
    }

    return rows ? rows.map(row => this.toDomain(row)) : [];
  }

  private toDomain(row: FollowRow): Follow {
    return Follow.reconstitute({
      id: row.id,
      followerId: row.follower_id,
      streamerId: row.streamer_id,
      streamerName: row.streamer_name,
      createdAt: new Date(row.created_at),
    });
  }
}

import { injectable } from 'tsyringe';
import { supabaseClient as supabase } from '../../database/supabase/client';
import { Stream } from '../../../domain/streams/entities/Stream';
import { IStreamRepository } from '../../../domain/streams/repositories/IStreamRepository';
import { logger } from '../../logging/logger';

interface StreamRow {
  id: string;
  match_id: number;
  streamer_id: string;
  streamer_name: string;
  streamer_wallet_address?: string;
  stream_key: string;
  hls_playlist_url?: string;
  status: 'active' | 'ended';
  viewer_count: number;
  created_at: string;
  ended_at?: string;
}

@injectable()
export class SupabaseStreamRepository implements IStreamRepository {
  async save(stream: Stream): Promise<Stream> {
    const row = this.toRow(stream);

    const { data, error } = await supabase
      .from('live_streams')
      .insert(row)
      .select()
      .single();

    if (error) {
      logger.error('Failed to save stream', { error: error.message });
      throw new Error('Failed to save stream');
    }

    return this.toDomain(data);
  }

  async findById(id: string): Promise<Stream | null> {
    const { data: row, error } = await supabase
      .from('live_streams')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      logger.error('Failed to find stream by id', { error: error.message, id });
      throw new Error('Failed to find stream');
    }

    return row ? this.toDomain(row) : null;
  }

  async findByStreamKey(streamKey: string): Promise<Stream | null> {
    const { data: row, error } = await supabase
      .from('live_streams')
      .select('*')
      .eq('stream_key', streamKey)
      .maybeSingle();

    if (error) {
      logger.error('Failed to find stream by key', { error: error.message, streamKey });
      throw new Error('Failed to find stream');
    }

    return row ? this.toDomain(row) : null;
  }

  async findActiveStreams(): Promise<Stream[]> {
    const { data: rows, error } = await supabase
      .from('live_streams')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Failed to find active streams', { error: error.message });
      throw new Error('Failed to find active streams');
    }

    return rows ? rows.map(row => this.toDomain(row)) : [];
  }

  async findOldEndedStreams(before: Date): Promise<Stream[]> {
    const { data: rows, error } = await supabase
      .from('live_streams')
      .select('*')
      .eq('status', 'ended')
      .not('ended_at', 'is', null)
      .lt('ended_at', before.toISOString());

    if (error) {
      logger.error('Failed to find old ended streams', { error: error.message });
      throw new Error('Failed to find old ended streams');
    }

    return rows ? rows.map(row => this.toDomain(row)) : [];
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('live_streams')
      .delete()
      .eq('id', id);

    if (error) {
      logger.error('Failed to delete stream', { error: error.message, id });
      throw new Error('Failed to delete stream');
    }
  }

  async update(stream: Stream): Promise<Stream> {
    const row = this.toRow(stream);

    const { data, error } = await supabase
      .from('live_streams')
      .update(row)
      .eq('id', stream.getId())
      .select()
      .single();

    if (error) {
      logger.error('Failed to update stream', { error: error.message, id: stream.getId() });
      throw new Error('Failed to update stream');
    }

    return this.toDomain(data);
  }

  private toDomain(row: StreamRow): Stream {
    return Stream.reconstitute({
      id: row.id,
      matchId: row.match_id,
      streamerId: row.streamer_id,
      streamerName: row.streamer_name,
      streamKey: row.stream_key,
      hlsUrl: row.hls_playlist_url,
      isLive: row.status === 'active',
      viewerCount: row.viewer_count,
      endedAt: row.ended_at ? new Date(row.ended_at) : undefined,
      createdAt: new Date(row.created_at),
    });
  }

  private toRow(stream: Stream): any {
    const json = stream.toJSON();
    return {
      id: json.id,
      match_id: json.matchId,
      streamer_id: json.streamerId,
      streamer_name: json.streamerName,
      stream_key: json.streamKey,
      hls_playlist_url: json.hlsUrl,
      status: json.isLive ? 'active' : 'ended',
      viewer_count: json.viewerCount,
      created_at: json.createdAt.toISOString(),
      ended_at: json.endedAt ? json.endedAt.toISOString() : null,
    };
  }
}

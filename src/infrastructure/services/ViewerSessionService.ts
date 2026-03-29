import { injectable } from 'tsyringe';
import { supabaseClient as supabase } from '../database/supabase/client';
import { logger } from '../logging/logger';

@injectable()
export class ViewerSessionService {
  // Throttle thumbnail uploads per stream (in-memory, single-process)
  private readonly thumbnailLastUpload = new Map<string, number>();

  async join(streamId: string, sessionToken: string): Promise<void> {
    try {
      // Upsert session — detect if INSERT (new viewer) vs UPDATE (heartbeat)
      const { error } = await supabase
        .from('viewer_sessions')
        .upsert(
          { stream_id: streamId, session_token: sessionToken, last_heartbeat_at: new Date().toISOString() },
          { onConflict: 'session_token', ignoreDuplicates: false }
        );

      if (error) {
        logger.warn('ViewerSessionService.join upsert failed', { streamId, error: error.message });
        return;
      }

      // Reconcile ensures correct count (handles new sessions + drift)
      // Called on join because it's lightweight when few sessions exist
      await this.reconcileCount(streamId);
    } catch (error) {
      logger.warn('ViewerSessionService.join error', { streamId, error: (error as Error).message });
    }
  }

  async leave(streamId: string, sessionToken: string): Promise<void> {
    try {
      await supabase.from('viewer_sessions').delete().eq('session_token', sessionToken);
      await this.reconcileCount(streamId);
    } catch (error) {
      logger.warn('ViewerSessionService.leave error', { streamId, error: (error as Error).message });
    }
  }

  // Purges stale sessions + recomputes COUNT(*) → updates viewer_count (triggers Realtime)
  async reconcileCount(streamId: string): Promise<void> {
    const staleThreshold = new Date(Date.now() - 45_000).toISOString();

    await supabase
      .from('viewer_sessions')
      .delete()
      .eq('stream_id', streamId)
      .lt('last_heartbeat_at', staleThreshold);

    const { count } = await supabase
      .from('viewer_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('stream_id', streamId);

    await supabase
      .from('live_streams')
      .update({ viewer_count: count ?? 0 })
      .eq('id', streamId);
  }

  // Reconcile all live streams — called by cron every 60s
  async reconcileAllLiveStreams(): Promise<void> {
    const { data: sessions } = await supabase
      .from('viewer_sessions')
      .select('stream_id');

    const { data: liveStreams } = await supabase
      .from('live_streams')
      .select('id')
      .eq('status', 'live')
      .gt('viewer_count', 0);

    const ids = [...new Set([
      ...(sessions ?? []).map((r: { stream_id: string }) => r.stream_id),
      ...(liveStreams ?? []).map((s: { id: string }) => s.id),
    ])];

    for (const streamId of ids) {
      await this.reconcileCount(streamId);
    }

    if (ids.length > 0) logger.info('ViewerReconcile done', { streamCount: ids.length });
  }

  isThumbnailThrottled(streamId: string, throttleMs = 15_000): boolean {
    const last = this.thumbnailLastUpload.get(streamId);
    if (last && Date.now() - last < throttleMs) return true;
    this.thumbnailLastUpload.set(streamId, Date.now());
    return false;
  }
}

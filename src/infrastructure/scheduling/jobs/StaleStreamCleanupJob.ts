import { injectable } from 'tsyringe';
import { container } from '../../config/di-container';
import { StreamLifecycleService } from '../../services/StreamLifecycleService';
import { IStreamRepository } from '../../../domain/streams/repositories/IStreamRepository';
import { logger } from '../../logging/logger';

/**
 * Stale Stream Cleanup Job
 * Runs every 3 minutes. Auto-ends LIVE streams whose heartbeat is older than 5 minutes.
 * Catches OBS crashes where runOnDisconnect did not fire.
 */
@injectable()
export class StaleStreamCleanupJob {
  private readonly schedule = '*/3 * * * *'; // Every 3 minutes

  getSchedule(): string {
    return this.schedule;
  }

  async execute(): Promise<void> {
    try {
      const lifecycleService = container.resolve(StreamLifecycleService);
      const streamRepository = container.resolve<IStreamRepository>('IStreamRepository');

      // Timeout = 5 minutes — tolerates OBS reconnects and brief network cuts
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const staleStreams = await streamRepository.findStaleLiveStreams(fiveMinutesAgo);

      if (staleStreams.length === 0) return;

      for (const stream of staleStreams) {
        await lifecycleService.endStreamIfNeeded(stream.getStreamKey());
        logger.warn('Stale stream auto-ended by cron', { streamKey: stream.getStreamKey() });
      }

      logger.info('Stale stream cleanup completed', { count: staleStreams.length });
    } catch (error) {
      logger.error('Stale stream cleanup job failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

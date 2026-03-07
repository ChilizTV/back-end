import { injectable, inject } from 'tsyringe';
import { IStreamRepository } from '../../domain/streams/repositories/IStreamRepository';
import { StreamStatus } from '../../domain/streams/entities/Stream';
import { logger } from '../logging/logger';

@injectable()
export class StreamLifecycleService {
  /**
   * Anti-spam: skips duplicate concurrent calls within the same process instance.
   * NOT a distributed lock — business idempotency is guaranteed by entity start()/end().
   */
  private readonly inFlight = new Set<string>();

  constructor(
    @inject('IStreamRepository')
    private readonly streamRepository: IStreamRepository,
  ) {}

  async startStreamIfNeeded(streamKey: string): Promise<void> {
    if (this.inFlight.has(streamKey)) {
      logger.debug('startStreamIfNeeded: in-flight, skipping', { streamKey });
      return;
    }
    this.inFlight.add(streamKey);
    try {
      const stream = await this.streamRepository.findByStreamKey(streamKey);
      if (!stream) {
        logger.warn('startStreamIfNeeded: key not found', { streamKey });
        return;
      }

      const previousStatus = stream.getStatus();
      if (previousStatus === StreamStatus.LIVE) {
        stream.heartbeat();
        await this.streamRepository.update(stream);
        logger.debug('Stream heartbeat refreshed', { streamKey });
        return;
      }

      stream.start();
      stream.heartbeat(); // always set on transition → guarantees lastHeartbeatAt non-null
      await this.streamRepository.update(stream);
      logger.info('Stream lifecycle change', {
        streamKey,
        previousStatus,
        newStatus: StreamStatus.LIVE,
      });
    } finally {
      this.inFlight.delete(streamKey);
    }
  }

  async endStreamIfNeeded(streamKey: string): Promise<void> {
    const stream = await this.streamRepository.findByStreamKey(streamKey);
    if (!stream) {
      logger.warn('endStreamIfNeeded: key not found', { streamKey });
      return;
    }

    const previousStatus = stream.getStatus();
    if (previousStatus !== StreamStatus.LIVE) {
      logger.debug('endStreamIfNeeded: not LIVE, skipping', { streamKey, previousStatus });
      return;
    }

    stream.end();
    await this.streamRepository.update(stream);
    logger.info('Stream lifecycle change', {
      streamKey,
      previousStatus,
      newStatus: StreamStatus.ENDED,
    });
  }
}

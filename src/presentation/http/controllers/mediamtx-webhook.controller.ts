import { Request, Response } from 'express';
import { injectable, inject } from 'tsyringe';
import { IStreamRepository } from '../../../domain/streams/repositories/IStreamRepository';
import { StreamLifecycleService } from '../../../infrastructure/services/StreamLifecycleService';
import { extractStreamKey } from '../../../infrastructure/streaming/utils/mediamtx-path';
import { logger } from '../../../infrastructure/logging/logger';
import { env } from '../../../infrastructure/config/environment';

interface MediamtxAuthPayload {
  action: 'publish' | 'read' | 'playback' | string;
  path: string;
  ip: string;
  user: string;
  password: string;
  protocol: string;
}

@injectable()
export class MediamtxWebhookController {
  constructor(
    @inject('IStreamRepository')
    private readonly streamRepository: IStreamRepository,
    @inject(StreamLifecycleService)
    private readonly lifecycleService: StreamLifecycleService,
  ) {}

  /**
   * POST /mediamtx/auth
   * Called by mediamtx for every publish or read attempt.
   * Returns 200 immediately — lifecycle update is fire-and-forget async.
   */
  async auth(req: Request, res: Response): Promise<void> {
    const payload = req.body as MediamtxAuthPayload;

    if (env.MEDIAMTX_PUBLISH_SECRET) {
      if (req.query['secret'] !== env.MEDIAMTX_PUBLISH_SECRET) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }
    }

    // Viewers and playback are always allowed
    if (payload.action === 'read' || payload.action === 'playback') {
      res.status(200).end();
      return;
    }

    // Unknown future action types — allow but don't trigger lifecycle
    if (payload.action !== 'publish') {
      res.status(200).end();
      return;
    }

    const streamKey = extractStreamKey(payload.path);
    if (!streamKey) {
      res.status(401).json({ error: 'Invalid path' });
      return;
    }

    // Fast format check — avoids DB query for obviously invalid keys
    if (!/^[a-zA-Z0-9_-]{16,}$/.test(streamKey)) {
      logger.warn('mediamtx auth denied: invalid key format', { path: payload.path });
      res.status(401).end();
      return;
    }

    const stream = await this.streamRepository.findByStreamKey(streamKey);
    if (!stream) {
      logger.warn('mediamtx auth denied: unknown key', { streamKey, path: payload.path });
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    logger.info('OBS publish detected', { streamKey, path: payload.path, action: payload.action });

    // Respond immediately — lifecycle update is async (non-blocking)
    res.status(200).end();

    this.lifecycleService.startStreamIfNeeded(streamKey).catch(err =>
      logger.error('Failed to start stream after auth', { streamKey, err: err.message }),
    );
  }

  /**
   * POST /mediamtx/disconnect
   * Called by mediamtx runOnDisconnect when a publisher disconnects.
   */
  async disconnect(req: Request, res: Response): Promise<void> {
    const streamKey = extractStreamKey((req.query['path'] as string) ?? '');
    res.status(200).end();

    if (streamKey) {
      logger.info('OBS disconnect detected', { streamKey });
      this.lifecycleService.endStreamIfNeeded(streamKey).catch(err =>
        logger.error('Failed to end stream on disconnect', { streamKey, err: err.message }),
      );
    }
  }
}

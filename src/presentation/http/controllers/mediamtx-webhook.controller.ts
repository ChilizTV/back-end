import { Request, Response } from 'express';
import { injectable, inject } from 'tsyringe';
import { IStreamRepository } from '../../../domain/streams/repositories/IStreamRepository';
import { logger } from '../../../infrastructure/logging/logger';
import { env } from '../../../infrastructure/config/environment';

interface MediamtxAuthPayload {
  action: 'publish' | 'read' | 'playback';
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
  ) {}

  /**
   * POST /mediamtx/auth
   * Called by mediamtx for every publish or read attempt.
   * Returns 200 to allow, 4xx to deny.
   */
  async auth(req: Request, res: Response): Promise<void> {
    const payload = req.body as MediamtxAuthPayload;

    // Validate shared secret to prevent spoofing from arbitrary callers
    if (env.MEDIAMTX_PUBLISH_SECRET) {
      if (req.query['secret'] !== env.MEDIAMTX_PUBLISH_SECRET) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }
    }

    // Viewers are always allowed
    if (payload.action === 'read' || payload.action === 'playback') {
      res.status(200).end();
      return;
    }

    // Publishers: verify stream key exists and is active in DB
    // mediamtx path format: "live/{streamKey}"
    const streamKey = payload.path.replace(/^live\//, '');
    const stream = await this.streamRepository.findByStreamKey(streamKey);

    if (!stream || !stream.isLive()) {
      logger.warn('mediamtx auth denied', { path: payload.path, streamKey });
      res.status(401).json({ error: 'Unauthorized: stream key not found or stream is ended' });
      return;
    }

    logger.info('mediamtx auth granted', { path: payload.path, streamKey });
    res.status(200).end();
  }
}

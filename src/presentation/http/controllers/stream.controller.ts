import { Request, Response, NextFunction } from 'express';
import { injectable, inject } from 'tsyringe';
import { CreateStreamUseCase } from '../../../application/streams/use-cases/CreateStreamUseCase';
import { GetActiveStreamsUseCase } from '../../../application/streams/use-cases/GetActiveStreamsUseCase';
import { GetPreferredStreamUseCase } from '../../../application/streams/use-cases/GetPreferredStreamUseCase';
import { EndStreamUseCase } from '../../../application/streams/use-cases/EndStreamUseCase';
import { UpdateViewerCountUseCase } from '../../../application/streams/use-cases/UpdateViewerCountUseCase';
import { ViewerSessionService } from '../../../infrastructure/services/ViewerSessionService';
import { supabaseClient as supabase } from '../../../infrastructure/database/supabase/client';
import { logger } from '../../../infrastructure/logging/logger';

@injectable()
export class StreamController {
  constructor(
    @inject(CreateStreamUseCase)
    private readonly createStreamUseCase: CreateStreamUseCase,
    @inject(GetActiveStreamsUseCase)
    private readonly getActiveStreamsUseCase: GetActiveStreamsUseCase,
    @inject(GetPreferredStreamUseCase)
    private readonly getPreferredStreamUseCase: GetPreferredStreamUseCase,
    @inject(EndStreamUseCase)
    private readonly endStreamUseCase: EndStreamUseCase,
    @inject(UpdateViewerCountUseCase)
    private readonly updateViewerCountUseCase: UpdateViewerCountUseCase,
    @inject(ViewerSessionService)
    private readonly viewerSessionService: ViewerSessionService,
  ) {}

  async createStream(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { matchId, streamerId, streamerName, streamerWalletAddress, title } = req.body;

      const stream = await this.createStreamUseCase.execute({
        matchId,
        streamerId,
        streamerName,
        streamerWalletAddress,
        title,
      });

      res.status(201).json({
        success: true,
        stream: stream.toJSON(),
      });
    } catch (error) {
      next(error);
    }
  }

  async getPreferredStream(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const matchId = parseInt(req.query['matchId'] as string);
      const userId = req.query['userId'] as string | undefined;

      if (!matchId || isNaN(matchId)) {
        res.status(400).json({ error: 'matchId required' });
        return;
      }

      const result = await this.getPreferredStreamUseCase.execute(matchId, userId);
      res.json({ success: true, stream: result.stream?.toJSON() ?? null, source: result.source });
    } catch (error) {
      next(error);
    }
  }

  async getActiveStreams(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const matchIdRaw = req.query['matchId'] as string | undefined;
      const matchId = matchIdRaw ? parseInt(matchIdRaw) : undefined;
      const streams = await this.getActiveStreamsUseCase.execute(matchId);

      res.json({
        success: true,
        streams: streams.map(s => s.toJSON()),
        count: streams.length,
      });
    } catch (error) {
      next(error);
    }
  }

  async endStream(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { streamId, streamKey } = req.body;

      await this.endStreamUseCase.execute({ streamId, streamKey });

      res.json({
        success: true,
        message: 'Stream ended successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async updateViewerCount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { streamId } = req.params;
      const { viewerCount } = req.body;

      await this.updateViewerCountUseCase.execute(streamId, viewerCount);

      res.json({ success: true, message: 'Viewer count updated' });
    } catch (error) {
      next(error);
    }
  }

  async joinViewer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { sessionToken } = req.body;
      if (!sessionToken) { res.status(400).json({ error: 'sessionToken required' }); return; }
      await this.viewerSessionService.join(id, sessionToken);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }

  async leaveViewer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { sessionToken } = req.body;
      if (!sessionToken) { res.status(400).json({ error: 'sessionToken required' }); return; }
      await this.viewerSessionService.leave(id, sessionToken);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }

  async uploadThumbnail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const file = (req as Request & { file?: Express.Multer.File }).file;

      if (!file) { res.status(400).json({ error: 'No file uploaded' }); return; }
      if (file.mimetype !== 'image/jpeg') { res.status(400).json({ error: 'Only image/jpeg accepted' }); return; }

      if (this.viewerSessionService.isThumbnailThrottled(id)) {
        res.json({ success: true, throttled: true });
        return;
      }

      const path = `${id}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('stream-thumbnails')
        .upload(path, file.buffer, { contentType: 'image/jpeg', upsert: true });

      if (uploadError) {
        logger.warn('Thumbnail upload failed', { id, error: uploadError.message });
        res.status(500).json({ error: 'Upload failed' });
        return;
      }

      const { data: urlData } = supabase.storage.from('stream-thumbnails').getPublicUrl(path);
      const thumbnailUrl = urlData.publicUrl;

      await supabase.from('live_streams').update({ thumbnail_url: thumbnailUrl }).eq('id', id);

      res.json({ success: true, thumbnailUrl });
    } catch (error) {
      next(error);
    }
  }
}

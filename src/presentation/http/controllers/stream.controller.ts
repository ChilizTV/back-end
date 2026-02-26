import { Request, Response, NextFunction } from 'express';
import { injectable, inject } from 'tsyringe';
import { CreateStreamUseCase } from '../../../application/streams/use-cases/CreateStreamUseCase';
import { GetActiveStreamsUseCase } from '../../../application/streams/use-cases/GetActiveStreamsUseCase';
import { EndStreamUseCase } from '../../../application/streams/use-cases/EndStreamUseCase';
import { UpdateViewerCountUseCase } from '../../../application/streams/use-cases/UpdateViewerCountUseCase';

@injectable()
export class StreamController {
  constructor(
    @inject(CreateStreamUseCase)
    private readonly createStreamUseCase: CreateStreamUseCase,
    @inject(GetActiveStreamsUseCase)
    private readonly getActiveStreamsUseCase: GetActiveStreamsUseCase,
    @inject(EndStreamUseCase)
    private readonly endStreamUseCase: EndStreamUseCase,
    @inject(UpdateViewerCountUseCase)
    private readonly updateViewerCountUseCase: UpdateViewerCountUseCase
  ) {}

  async createStream(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { matchId, streamerId, streamerName, streamerWalletAddress } = req.body;

      const stream = await this.createStreamUseCase.execute({
        matchId,
        streamerId,
        streamerName,
        streamerWalletAddress,
      });

      res.status(201).json({
        success: true,
        stream: stream.toJSON(),
      });
    } catch (error) {
      next(error);
    }
  }

  async getActiveStreams(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const streams = await this.getActiveStreamsUseCase.execute();

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

      res.json({
        success: true,
        message: 'Viewer count updated',
      });
    } catch (error) {
      next(error);
    }
  }
}

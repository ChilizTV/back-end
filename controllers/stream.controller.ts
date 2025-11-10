import { Request, Response, Router } from 'express';
import { streamService } from '../services/stream.service';
import { 
    CreateStreamRequest, 
    EndStreamRequest 
} from '../models/stream.model';

export class StreamController {
    private router: Router;

    constructor() {
        this.router = Router();
        this.buildRoutes();
    }

    private buildRoutes(): void {
        this.router.post('/', this.createStream.bind(this));
        this.router.get('/', this.getActiveStreams.bind(this));
        this.router.delete('/', this.endStream.bind(this));
        this.router.get('/:streamKey/playlist', this.getStreamPlaylist.bind(this));
        this.router.put('/:streamId/viewers', this.updateViewerCount.bind(this));
    }

    getRouter(): Router {
        return this.router;
    }

    /**
     * POST /stream
     * Create a new live stream for a match
     */
    private async createStream(req: Request, res: Response): Promise<void> {
        try {
            console.log('📺 POST /stream - Creating new stream');

            const body: CreateStreamRequest = req.body;

            // Validate required fields
            if (!body.matchId || !body.streamerId || !body.streamerName) {
                res.status(400).json({
                    success: false,
                    error: 'Missing required fields: matchId, streamerId, streamerName'
                });
                return;
            }

            try {
                const result = await streamService.createStream(body);

                if (result.success && result.stream) {
                    res.status(201).json(result);
                    console.log('✅ Stream created successfully:', result.stream?.id);
                } else {
                    res.status(500).json(result);
                }
            } catch (error) {
                throw error;
            }
        } catch (error) {
            console.error('❌ Error in createStream:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    /**
     * GET /stream?matchId=X
     * Get all active streams for a match
     */
    private async getActiveStreams(req: Request, res: Response): Promise<void> {
        try {
            const matchId = req.query.matchId;

            if (!matchId) {
                res.status(400).json({
                    success: false,
                    streams: [],
                    error: 'matchId query parameter is required'
                });
                return;
            }

            console.log(`📋 GET /stream - Fetching streams for match ${matchId}`);

            try {
                const result = await streamService.getActiveStreams(parseInt(matchId as string));

                res.status(200).json(result);
                console.log(`✅ Found ${result.streams.length} active streams for match ${matchId}`);
            } catch (error) {
                throw error;
            }
        } catch (error) {
            console.error('❌ Error in getActiveStreams:', error);
            res.status(500).json({
                success: false,
                streams: [],
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    /**
     * DELETE /stream
     * End a stream
     */
    private async endStream(req: Request, res: Response): Promise<void> {
        try {
            console.log('🛑 DELETE /stream - Ending stream');

            const body: EndStreamRequest = req.body;

            // Validate required fields
            if (!body.streamId || !body.streamerId) {
                res.status(400).json({
                    success: false,
                    error: 'Missing required fields: streamId, streamerId'
                });
                return;
            }

            try {
                const result = await streamService.endStream(body);

                if (result.success) {
                    res.status(200).json(result);
                    console.log('✅ Stream ended successfully:', body.streamId);
                } else {
                    res.status(500).json(result);
                }
            } catch (error) {
                throw error;
            }
        } catch (error) {
            console.error('❌ Error in endStream:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    /**
     * GET /stream/:streamKey/playlist
     * Get stream playlist URL
     */
    private async getStreamPlaylist(req: Request, res: Response): Promise<void> {
        try {
            const { streamKey } = req.params;

            if (!streamKey) {
                res.status(400).json({
                    success: false,
                    error: 'streamKey parameter is required'
                });
                return;
            }

            const playlistUrl = streamService.getStreamPlaylist(streamKey);

            res.status(200).json({
                success: true,
                playlistUrl
            });

        } catch (error) {
            console.error('❌ Error in getStreamPlaylist:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    /**
     * PUT /stream/:streamId/viewers
     * Update viewer count for a stream
     */
    private async updateViewerCount(req: Request, res: Response): Promise<void> {
        try {
            const { streamId } = req.params;
            const { count } = req.body;

            console.log(`📊 PUT /stream/${streamId}/viewers - Updating viewer count to ${count}`);

            if (!streamId || typeof count !== 'number') {
                res.status(400).json({
                    success: false,
                    error: 'streamId parameter and count number are required'
                });
                return;
            }

            await streamService.updateViewerCount(streamId, count);

            res.status(200).json({
                success: true
            });

            console.log(`✅ Viewer count updated for stream ${streamId}: ${count}`);

        } catch (error) {
            console.error('❌ Error in updateViewerCount:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
}


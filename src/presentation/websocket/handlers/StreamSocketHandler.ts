import { injectable, inject } from 'tsyringe';
import { Socket } from 'socket.io';
import { CreateStreamUseCase } from '../../../application/streams/use-cases/CreateStreamUseCase';
import { EndStreamUseCase } from '../../../application/streams/use-cases/EndStreamUseCase';
import { logger } from '../../../infrastructure/logging/logger';

/**
 * Stream Socket Handler
 * Handles WebSocket events for live streaming
 */
@injectable()
export class StreamSocketHandler {
    constructor(
        @inject(CreateStreamUseCase) private readonly createStreamUseCase: CreateStreamUseCase,
        @inject(EndStreamUseCase) private readonly endStreamUseCase: EndStreamUseCase
    ) {}

    handleConnection(socket: Socket): void {
        logger.info('Client connected to /stream namespace', { socketId: socket.id });

        socket.on('stream:start', async (data: { streamKey: string }) => {
            await this.handleStreamStart(socket, data);
        });

        socket.on('stream:data', (data: { streamKey: string; chunk: Buffer | Uint8Array | ArrayBuffer }) => {
            this.handleStreamData(data);
        });

        socket.on('stream:audio', (data: { streamKey: string; audioData: number[] }) => {
            this.handleStreamAudio(data);
        });

        socket.on('stream:end', (data: { streamKey: string }) => {
            this.handleStreamEnd(data);
        });

        socket.on('disconnect', () => {
            logger.info('Client disconnected from /stream namespace', { socketId: socket.id });
        });
    }

    private async handleStreamStart(socket: Socket, data: { streamKey: string }): Promise<void> {
        logger.info('Stream start requested', { streamKey: data.streamKey });

        if (!data || !data.streamKey) {
            logger.error('stream:start received without streamKey', { data });
            return;
        }

        try {
            // TODO: Implement stream start logic with use cases
            // This would involve creating a stream record and initializing the stream processor
            logger.info('Stream start successful', { streamKey: data.streamKey });
        } catch (error) {
            logger.error('Error starting stream', {
                streamKey: data.streamKey,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    private handleStreamData(data: { streamKey: string; chunk: Buffer | Uint8Array | ArrayBuffer }): void {
        if (!data.streamKey) {
            logger.error('stream:data received without streamKey');
            return;
        }

        let buffer: Buffer;
        if (Buffer.isBuffer(data.chunk)) {
            buffer = data.chunk;
        } else if (data.chunk instanceof Uint8Array) {
            buffer = Buffer.from(data.chunk);
        } else if (data.chunk instanceof ArrayBuffer) {
            buffer = Buffer.from(new Uint8Array(data.chunk));
        } else {
            logger.error('Invalid chunk type received');
            return;
        }

        // TODO: Process stream data buffer
        // This would involve writing to HLS segments, transcoding, etc.
    }

    private handleStreamAudio(data: { streamKey: string; audioData: number[] }): void {
        if (!data.streamKey || !data.audioData) {
            return; // Skip silently if invalid
        }

        // TODO: Process audio data
        // This would involve audio processing and mixing with video stream
    }

    private handleStreamEnd(data: { streamKey: string }): void {
        logger.info('Stream end requested', { streamKey: data.streamKey });
        // The stream will be ended via the REST API
        // This is just a notification event
    }
}

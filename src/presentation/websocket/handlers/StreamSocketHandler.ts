import { injectable, inject } from 'tsyringe';
import { Socket } from 'socket.io';
import { HlsStreamProcessor } from '../../../infrastructure/streaming/HlsStreamProcessor';
import { logger } from '../../../infrastructure/logging/logger';

@injectable()
export class StreamSocketHandler {
    constructor(
        @inject(HlsStreamProcessor)
        private readonly hlsProcessor: HlsStreamProcessor
    ) {}

    handleConnection(socket: Socket): void {
        logger.info('Client connected to /stream namespace', { socketId: socket.id });

        socket.on('stream:start', (data: { streamKey: string }) => {
            this.handleStreamStart(socket, data);
        });

        socket.on('stream:data', (data: { streamKey: string; chunk: Buffer | Uint8Array | ArrayBuffer }) => {
            this.handleStreamData(data);
        });

        socket.on('stream:audio', (data: { streamKey: string; audioData: number[]; sampleRate?: number }) => {
            this.handleStreamAudio(data);
        });

        socket.on('stream:end', (data: { streamKey: string }) => {
            this.handleStreamEnd(data);
        });

        socket.on('disconnect', () => {
            logger.info('Client disconnected from /stream namespace', { socketId: socket.id });
        });
    }

    private handleStreamStart(socket: Socket, data: { streamKey: string }): void {
        if (!data?.streamKey) {
            logger.error('stream:start received without streamKey');
            return;
        }

        logger.info('Stream start requested', { streamKey: data.streamKey });

        try {
            this.hlsProcessor.startStream(data.streamKey);
            socket.emit('stream:started', { streamKey: data.streamKey });
            logger.info('HLS stream started', { streamKey: data.streamKey });
        } catch (error) {
            logger.error('Error starting HLS stream', {
                streamKey: data.streamKey,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            socket.emit('stream:error', { message: 'Failed to start stream' });
        }
    }

    private handleStreamData(data: { streamKey: string; chunk: Buffer | Uint8Array | ArrayBuffer }): void {
        if (!data.streamKey) return;

        let buffer: Buffer;
        if (Buffer.isBuffer(data.chunk)) {
            buffer = data.chunk;
        } else if (data.chunk instanceof Uint8Array) {
            buffer = Buffer.from(data.chunk);
        } else if (data.chunk instanceof ArrayBuffer) {
            buffer = Buffer.from(new Uint8Array(data.chunk));
        } else {
            const raw = data.chunk as any;
            if (raw?.type === 'Buffer' && Array.isArray(raw.data)) {
                buffer = Buffer.from(raw.data);
            } else {
                return;
            }
        }

        this.hlsProcessor.sendVideoFrame(data.streamKey, buffer);
    }

    private handleStreamAudio(data: { streamKey: string; audioData: number[]; sampleRate?: number }): void {
        if (!data.streamKey || !data.audioData) return;

        this.hlsProcessor.sendAudioData(
            data.streamKey,
            data.audioData,
            data.sampleRate || 48000,
        );
    }

    private handleStreamEnd(data: { streamKey: string }): void {
        if (!data?.streamKey) return;

        logger.info('Stream end requested', { streamKey: data.streamKey });
        this.hlsProcessor.stopStream(data.streamKey).catch((error) => {
            logger.error('Error stopping HLS stream', {
                streamKey: data.streamKey,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        });
    }
}
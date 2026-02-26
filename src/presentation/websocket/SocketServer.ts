import { injectable } from 'tsyringe';
import { Server as SocketIOServer } from 'socket.io';
import { StreamSocketHandler } from './handlers/StreamSocketHandler';
import { logger } from '../../infrastructure/logging/logger';

/**
 * Socket Server
 * Orchestrates all Socket.IO namespaces and handlers
 */
@injectable()
export class SocketServer {
    constructor(
        private readonly streamHandler: StreamSocketHandler
    ) {}

    initialize(io: SocketIOServer): void {
        logger.info('Initializing Socket.IO server');

        // Stream namespace
        const streamNamespace = io.of('/stream');
        streamNamespace.on('connection', (socket) => {
            this.streamHandler.handleConnection(socket);
        });

        logger.info('Socket.IO namespaces initialized', {
            namespaces: ['/stream']
        });
    }
}

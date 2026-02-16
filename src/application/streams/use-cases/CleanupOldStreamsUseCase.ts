import { injectable, inject } from 'tsyringe';
import { IStreamRepository } from '../../../domain/streams/repositories/IStreamRepository';
import { logger } from '../../../infrastructure/logging/logger';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Cleanup Old Streams Use Case
 * Removes ended streams older than 24 hours from database and file system
 */
@injectable()
export class CleanupOldStreamsUseCase {
    private readonly streamsDir = path.join(process.cwd(), 'public', 'streams');

    constructor(
        @inject('IStreamRepository') private readonly streamRepository: IStreamRepository
    ) {}

    async execute(): Promise<{ success: boolean; deletedCount: number; error?: string }> {
        try {
            logger.info('Starting stream cleanup');

            // Get ended streams older than 24 hours
            const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const oldStreams = await this.streamRepository.findOldEndedStreams(twentyFourHoursAgo);

            let deletedCount = 0;

            for (const stream of oldStreams) {
                try {
                    // Delete stream directory from file system
                    const streamDir = path.join(this.streamsDir, stream.getStreamKey());
                    if (fs.existsSync(streamDir)) {
                        fs.rmSync(streamDir, { recursive: true, force: true });
                        logger.debug('Deleted stream directory', { streamKey: stream.getStreamKey() });
                    }

                    // Delete from database
                    await this.streamRepository.delete(stream.getId());
                    deletedCount++;

                    logger.debug('Deleted old stream', {
                        streamId: stream.getId(),
                        streamKey: stream.getStreamKey()
                    });
                } catch (err) {
                    logger.warn('Failed to delete stream', {
                        streamId: stream.getId(),
                        error: err instanceof Error ? err.message : 'Unknown error'
                    });
                }
            }

            logger.info('Stream cleanup completed', { deletedCount });

            return { success: true, deletedCount };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error('Stream cleanup failed', { error: errorMessage });
            return { success: false, deletedCount: 0, error: errorMessage };
        }
    }
}

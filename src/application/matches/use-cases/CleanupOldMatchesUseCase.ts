import { injectable, inject } from 'tsyringe';
import { IMatchRepository } from '../../../domain/matches/repositories/IMatchRepository';
import { MatchFetchWindow } from '../../../domain/matches/value-objects/MatchFetchWindow';
import { logger } from '../../../infrastructure/logging/logger';

/**
 * Cleanup Old Matches Use Case
 * Removes matches that are older than a specified date
 * Typically used to clean up matches outside the 24h window
 */
@injectable()
export class CleanupOldMatchesUseCase {
    constructor(
        @inject('IMatchRepository') private readonly matchRepository: IMatchRepository
    ) {}

    /**
     * Delete matches older than the specified date
     * @param before - Delete matches before this date
     * @returns Number of matches deleted
     */
    async execute(before: Date): Promise<number> {
        try {
            logger.info('Cleaning up old matches', { before: before.toISOString() });

            const deletedCount = await this.matchRepository.deleteOldMatches(before);

            logger.info('Old matches cleaned up', { deletedCount });

            return deletedCount;
        } catch (error) {
            logger.error('Failed to cleanup old matches', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }

    /**
     * Convenience method to delete matches outside 24h window
     */
    async cleanupOutside24Hours(): Promise<number> {
        return this.execute(MatchFetchWindow.cleanupBefore(new Date()));
    }
}

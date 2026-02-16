import { injectable } from 'tsyringe';
import { container } from '../../config/di-container';
import { ResolveFinishedMatchesUseCase } from '../../../application/matches/use-cases/ResolveFinishedMatchesUseCase';
import { logger } from '../../logging/logger';

/**
 * Resolve Markets Job
 * Runs every hour as a safety net to resolve betting markets on-chain
 * for finished matches (main resolution runs after each match sync)
 */
@injectable()
export class ResolveMarketsJob {
    private readonly intervalMs = 60 * 60 * 1000; // 1 hour

    getIntervalMs(): number {
        return this.intervalMs;
    }

    async execute(): Promise<void> {
        try {
            logger.info('Starting market resolution job');

            const resolveUseCase = container.resolve(ResolveFinishedMatchesUseCase);
            const result = await resolveUseCase.execute();

            logger.info('Market resolution completed', {
                matchesProcessed: result.matchesProcessed,
                marketsResolved: result.marketsResolved
            });
        } catch (error) {
            logger.error('Market resolution job failed', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
}

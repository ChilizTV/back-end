import { injectable } from 'tsyringe';
import { container } from '../../config/di-container';
import { SettlePredictionsUseCase } from '../../../application/predictions/use-cases/SettlePredictionsUseCase';
import { logger } from '../../logging/logger';

/**
 * Settle Predictions Job
 * Runs every 5 minutes to automatically settle predictions
 * based on finished match results
 */
@injectable()
export class SettlePredictionsJob {
    private readonly intervalMs = 5 * 60 * 1000; // 5 minutes

    getIntervalMs(): number {
        return this.intervalMs;
    }

    async execute(): Promise<void> {
        try {
            logger.info('Starting prediction settlement job');

            const settleUseCase = container.resolve(SettlePredictionsUseCase);
            const settledCount = await settleUseCase.execute();

            logger.info('Prediction settlement completed', { settledCount });
        } catch (error) {
            logger.error('Prediction settlement job failed', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
}

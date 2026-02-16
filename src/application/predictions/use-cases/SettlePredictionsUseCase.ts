import { injectable, inject } from 'tsyringe';
import { IPredictionRepository } from '../../../domain/predictions/repositories/IPredictionRepository';
import { IMatchRepository } from '../../../domain/matches/repositories/IMatchRepository';
import { logger } from '../../../infrastructure/logging/logger';

/**
 * Settle Predictions Use Case
 * Automatically settles predictions based on finished match results
 */
@injectable()
export class SettlePredictionsUseCase {
    constructor(
        @inject('IPredictionRepository') private readonly predictionRepository: IPredictionRepository,
        @inject('IMatchRepository') private readonly matchRepository: IMatchRepository
    ) {}

    async execute(): Promise<number> {
        try {
            logger.info('Starting prediction settlement');

            // Get predictions that need settlement (pending/in-progress for matches that have started)
            const predictions = await this.predictionRepository.findPendingForSettlement();

            if (predictions.length === 0) {
                logger.debug('No predictions to settle');
                return 0;
            }

            let settledCount = 0;

            for (const prediction of predictions) {
                try {
                    // Get match to check if it's finished and has scores
                    const match = await this.matchRepository.findById(prediction.getMatchId());

                    if (!match) {
                        logger.warn('Match not found for prediction', { predictionId: prediction.getId() });
                        continue;
                    }

                    // Only settle if match is finished and has scores
                    if (match.getStatus() !== 'FT') {
                        continue;
                    }

                    const homeScore = match.getHomeScore();
                    const awayScore = match.getAwayScore();

                    if (homeScore === undefined || homeScore === null || awayScore === undefined || awayScore === null) {
                        logger.warn('Match finished but scores not available', {
                            matchId: match.getId(),
                            predictionId: prediction.getId()
                        });
                        continue;
                    }

                    // Determine if prediction won or lost
                    const predictionType = prediction.getPredictionType();
                    const predictionValue = prediction.getPredictionValue();
                    const isWin = this.determineResult(homeScore, awayScore, predictionType, predictionValue);
                    const actualResult = this.getActualResult(homeScore, awayScore, predictionType);

                    // Settle the prediction
                    prediction.settle(actualResult, isWin);

                    // Update in repository
                    await this.predictionRepository.update(prediction);

                    settledCount++;

                    logger.debug('Prediction settled', {
                        predictionId: prediction.getId(),
                        matchId: match.getId(),
                        isWin,
                        actualResult
                    });
                } catch (err) {
                    logger.error('Failed to settle prediction', {
                        predictionId: prediction.getId(),
                        error: err instanceof Error ? err.message : 'Unknown error'
                    });
                }
            }

            logger.info('Prediction settlement completed', { settledCount });

            return settledCount;
        } catch (error) {
            logger.error('Prediction settlement failed', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }

    /**
     * Determine if the prediction won based on match result
     */
    private determineResult(
        homeScore: number,
        awayScore: number,
        predictionType: string,
        predictionValue: string
    ): boolean {
        if (predictionType === 'match_winner') {
            if (predictionValue === 'home') {
                return homeScore > awayScore;
            } else if (predictionValue === 'away') {
                return awayScore > homeScore;
            } else if (predictionValue === 'draw') {
                return homeScore === awayScore;
            }
        } else if (predictionType === 'first_half_winner') {
            // For first half, we would need HT scores from the match data
            // For now, return false as we don't have HT scores in schema
            return false;
        }

        return false;
    }

    /**
     * Get the actual result string from scores
     */
    private getActualResult(homeScore: number, awayScore: number, predictionType: string): string {
        if (predictionType === 'match_winner') {
            if (homeScore > awayScore) {
                return 'home';
            } else if (awayScore > homeScore) {
                return 'away';
            } else {
                return 'draw';
            }
        }
        return 'unknown';
    }
}

import { supabase } from '../config/supabase';
import { ServiceResult, ServiceErrorCode } from './service.result';
import { 
    Prediction, 
    CreatePredictionRequest, 
    UserPredictionStats, 
    PredictionStatus,
    PendingSettlementPrediction 
} from '../models/prediction.model';

export class PredictionService {
    constructor() {
        console.log('🎯 Prediction service initialized');
    }

    /**
     * Save a new prediction to the database
     */
    async savePrediction(data: CreatePredictionRequest): Promise<ServiceResult<Prediction>> {
        try {
            console.log('💾 Saving prediction:', data);

            const predictionData = {
                user_id: data.userId,
                wallet_address: data.walletAddress,
                username: data.username,
                match_id: data.matchId,
                match_name: data.matchName,
                prediction_type: data.predictionType,
                prediction_value: data.predictionValue,
                predicted_team: data.predictedTeam,
                odds: data.odds,
                transaction_hash: data.transactionHash,
                placed_at: new Date().toISOString(),
                match_start_time: data.matchStartTime,
                status: PredictionStatus.PENDING
            };

            const { data: prediction, error } = await supabase
                .from('predictions')
                .insert(predictionData)
                .select()
                .single();

            if (error) {
                console.error('❌ Error saving prediction:', error);
                return ServiceResult.failed<Prediction>();
            }

            console.log('✅ Prediction saved successfully:', prediction.id);

            return ServiceResult.success(this.mapPrediction(prediction));
        } catch (error: any) {
            console.error('❌ Exception saving prediction:', error);
            return ServiceResult.failed<Prediction>();
        }
    }

    /**
     * Get user's prediction history
     */
    async getUserPredictions(
        userId: string, 
        walletAddress: string, 
        limit: number = 50, 
        offset: number = 0
    ): Promise<ServiceResult<Prediction[]>> {
        try {
            console.log(`📜 Fetching predictions for user ${userId}, wallet ${walletAddress}`);

            const { data: predictions, error } = await supabase
                .from('predictions')
                .select('*')
                .eq('user_id', userId)
                .eq('wallet_address', walletAddress)
                .order('placed_at', { ascending: false })
                .range(offset, offset + limit - 1);

            if (error) {
                console.error('❌ Error fetching predictions:', error);
                return ServiceResult.failed<Prediction[]>();
            }

            console.log(`✅ Found ${predictions?.length || 0} predictions`);

            return ServiceResult.success((predictions || []).map(p => this.mapPrediction(p)));
        } catch (error: any) {
            console.error('❌ Exception fetching predictions:', error);
            return ServiceResult.failed<Prediction[]>();
        }
    }

    /**
     * Get user's prediction statistics
     */
    async getUserStats(userId: string, walletAddress: string): Promise<ServiceResult<UserPredictionStats>> {
        try {
            console.log(`📊 Fetching stats for user ${userId}, wallet ${walletAddress}`);

            const { data: stats, error } = await supabase
                .from('user_prediction_stats')
                .select('*')
                .eq('user_id', userId)
                .eq('wallet_address', walletAddress)
                .single();

            if (error) {
                // If no stats found, return zeros
                if (error.code === 'PGRST116') {
                    return ServiceResult.success({
                        userId,
                        walletAddress,
                        totalPredictions: 0,
                        totalWins: 0,
                        totalLosses: 0,
                        activePredictions: 0,
                        winRate: 0
                    });
                }

                console.error('❌ Error fetching stats:', error);
                return ServiceResult.failed<UserPredictionStats>();
            }

            console.log('✅ Stats fetched successfully');

            return ServiceResult.success({
                userId: stats.user_id,
                walletAddress: stats.wallet_address,
                totalPredictions: stats.total_predictions || 0,
                totalWins: stats.total_wins || 0,
                totalLosses: stats.total_losses || 0,
                activePredictions: stats.active_predictions || 0,
                winRate: stats.win_rate || 0
            });
        } catch (error: any) {
            console.error('❌ Exception fetching stats:', error);
            return ServiceResult.failed<UserPredictionStats>();
        }
    }

    /**
     * Update prediction status
     */
    async updatePredictionStatus(
        predictionId: string, 
        status: PredictionStatus, 
        actualResult?: string
    ): Promise<ServiceResult<Prediction>> {
        try {
            console.log(`🔄 Updating prediction ${predictionId} to ${status}`);

            const updateData: any = {
                status,
                updated_at: new Date().toISOString()
            };

            if (actualResult) {
                updateData.actual_result = actualResult;
            }

            if (status === PredictionStatus.WON || status === PredictionStatus.LOST) {
                updateData.settled_at = new Date().toISOString();
            }

            const { data: prediction, error } = await supabase
                .from('predictions')
                .update(updateData)
                .eq('id', predictionId)
                .select()
                .single();

            if (error) {
                console.error('❌ Error updating prediction:', error);
                return ServiceResult.failed<Prediction>();
            }

            console.log('✅ Prediction updated successfully');

            return ServiceResult.success(this.mapPrediction(prediction));
        } catch (error: any) {
            console.error('❌ Exception updating prediction:', error);
            return ServiceResult.failed<Prediction>();
        }
    }

    /**
     * Get all predictions that are ready to be settled
     */
    async getPendingPredictions(): Promise<ServiceResult<PendingSettlementPrediction[]>> {
        try {
            console.log('🔍 Fetching pending settlement predictions');

            const { data: predictions, error } = await supabase
                .from('pending_settlement_predictions')
                .select('*');

            if (error) {
                console.error('❌ Error fetching pending predictions:', error);
                return ServiceResult.failed<PendingSettlementPrediction[]>();
            }

            console.log(`✅ Found ${predictions?.length || 0} predictions to settle`);

            return ServiceResult.success((predictions || []).map(p => ({
                ...this.mapPrediction(p),
                homeTeam: p.home_team,
                awayTeam: p.away_team,
                homeScore: p.home_score,
                awayScore: p.away_score,
                matchStatus: p.match_status
            })));
        } catch (error: any) {
            console.error('❌ Exception fetching pending predictions:', error);
            return ServiceResult.failed<PendingSettlementPrediction[]>();
        }
    }

    /**
     * Settle predictions based on match results
     */
    async settlePredictions(): Promise<ServiceResult<number>> {
        try {
            console.log('⚖️ Starting prediction settlement process');

            const pendingResult = await this.getPendingPredictions();
            if (pendingResult.errorCode !== ServiceErrorCode.success || !pendingResult.result) {
                return ServiceResult.failed<number>();
            }

            const predictions = pendingResult.result;
            let settledCount = 0;

            for (const prediction of predictions) {
                const result = this.determineResult(
                    prediction.homeScore,
                    prediction.awayScore,
                    prediction.predictionType,
                    prediction.predictionValue
                );

                const status = result ? PredictionStatus.WON : PredictionStatus.LOST;
                const actualResult = this.getActualResult(
                    prediction.homeScore,
                    prediction.awayScore,
                    prediction.predictionType
                );

                await this.updatePredictionStatus(prediction.id, status, actualResult);
                settledCount++;
            }

            console.log(`✅ Settled ${settledCount} predictions`);

            return ServiceResult.success(settledCount);
        } catch (error: any) {
            console.error('❌ Exception settling predictions:', error);
            return ServiceResult.failed<number>();
        }
    }

    /**
     * Determine if a prediction won based on match result
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

    /**
     * Map database record to Prediction model
     */
    private mapPrediction(record: any): Prediction {
        return {
            id: record.id,
            userId: record.user_id,
            walletAddress: record.wallet_address,
            username: record.username,
            matchId: record.match_id,
            matchName: record.match_name,
            predictionType: record.prediction_type,
            predictionValue: record.prediction_value,
            predictedTeam: record.predicted_team,
            odds: parseFloat(record.odds),
            status: record.status as PredictionStatus,
            actualResult: record.actual_result,
            transactionHash: record.transaction_hash,
            placedAt: new Date(record.placed_at),
            matchStartTime: new Date(record.match_start_time),
            settledAt: record.settled_at ? new Date(record.settled_at) : undefined,
            createdAt: new Date(record.created_at),
            updatedAt: new Date(record.updated_at)
        };
    }
}

export const predictionService = new PredictionService();


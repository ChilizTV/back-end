import { predictionService } from '../services/prediction.service';
import { ServiceErrorCode } from '../services/service.result';

const SETTLEMENT_INTERVAL = 5 * 60 * 1000; // 5 minutes

/**
 * Cron job to automatically settle predictions based on match results
 */
export function startPredictionSettlementCron() {
    console.log('🔄 Starting prediction settlement cron job');
    console.log(`⏰ Settlement will run every ${SETTLEMENT_INTERVAL / 1000 / 60} minutes`);

    // Run immediately on startup
    settlePredictions();

    // Then run at intervals
    setInterval(settlePredictions, SETTLEMENT_INTERVAL);
}

async function settlePredictions() {
    try {
        console.log('⚖️ [CRON] Running prediction settlement');
        
        const result = await predictionService.settlePredictions();
        
        if (result.errorCode === ServiceErrorCode.success && result.result !== undefined) {
            console.log(`✅ [CRON] Settled ${result.result} predictions`);
        } else {
            console.error(`❌ [CRON] Failed to settle predictions`);
        }
    } catch (error: any) {
        console.error('❌ [CRON] Exception during prediction settlement:', error);
    }
}


import { matchResolutionService } from '../services/match-resolution.service';

const RESOLVE_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Cron job to resolve betting markets on-chain for finished matches (FT).
 * Calls resolveMarket(marketId, result) for each non-resolved market (WINNER, GOALS_TOTAL, BOTH_SCORE).
 */
export function startResolveMarketsCron() {
    console.log('🔄 Starting resolve-markets cron job');
    console.log(`⏰ Resolution will run every ${RESOLVE_INTERVAL_MS / 1000 / 60} minutes`);

    resolveFinishedMatches();

    setInterval(resolveFinishedMatches, RESOLVE_INTERVAL_MS);
}

async function resolveFinishedMatches() {
    try {
        console.log('⚖️ [CRON] Running on-chain market resolution');
        const result = await matchResolutionService.resolveFinishedMatches();
        console.log(
            `✅ [CRON] Resolve markets: ${result.matchesProcessed} match(es) processed, ${result.marketsResolved} market(s) resolved`
        );
    } catch (error: any) {
        console.error('❌ [CRON] Exception during market resolution:', error);
    }
}

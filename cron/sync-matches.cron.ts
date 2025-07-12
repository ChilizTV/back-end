import { MatchService } from '../services';
import cron from 'node-cron';

const matchService = new MatchService();

async function syncMatches() {
    try {
        console.log('🔄 ===== CRON JOB: Starting match synchronization =====');
        const startTime = Date.now();
        
        const result = await matchService.refetchMatchesFromApi();
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        if (result.errorCode === 0) {
            console.log(`✅ CRON JOB: Match synchronization completed successfully in ${duration}ms`);
            
            const cacheStats = matchService.getCacheStats();
            console.log(`📊 Cache Stats: ${cacheStats.matchesCount} matches, age: ${cacheStats.cacheAgeMinutes?.toFixed(2)} minutes`);
        } else {
            console.error('❌ CRON JOB: Match synchronization failed');
        }
        
        console.log('🔄 ===== CRON JOB: Match synchronization finished =====\n');
    } catch (error) {
        console.error('❌ CRON JOB: Error during match synchronization:', error);
    }
}

export function startMatchSyncCron() {
    console.log('⏰ Starting match synchronization cron job (every 10 minutes)...');
    
    cron.schedule('*/10 * * * *', syncMatches, {
        scheduled: true,
        timezone: "UTC"
    });

    console.log('🚀 Executing initial match synchronization...');
    syncMatches();

    console.log('✅ Match synchronization cron job started successfully');
}

export function stopMatchSyncCron() {
    console.log('⏹️ Stopping match synchronization cron job');
} 
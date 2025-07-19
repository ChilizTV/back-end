import { MatchService } from '../services/match.service';
import { MatchSyncResult } from '../models/supabase-match.model';
import cron from 'node-cron';

const matchService = new MatchService();

async function syncMatches() {
    try {
        console.log('🔄 ===== CRON JOB: Starting match synchronization =====');
        const startTime = Date.now();
        
        const result = await matchService.syncMatches();
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        if (result.errorCode === 0) {
            const syncResult = result.result as MatchSyncResult;
            console.log(`✅ CRON JOB: Match synchronization completed successfully in ${duration}ms`);
            console.log(`📊 Sync Stats: ${syncResult.stored} matches stored, ${syncResult.cleaned} matches cleaned`);
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
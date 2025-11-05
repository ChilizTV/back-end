import { streamService } from '../services/stream.service';
import cron from 'node-cron';

async function cleanupStreams() {
    try {
        console.log('🧹 ===== CRON JOB: Starting stream cleanup =====');
        const startTime = Date.now();
        
        const result = await streamService.cleanupOldStreams();
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        if (result.success) {
            console.log(`✅ CRON JOB: Stream cleanup completed successfully in ${duration}ms`);
            console.log(`📊 Cleanup Stats: ${result.deletedCount || 0} old streams deleted`);
        } else {
            console.error('❌ CRON JOB: Stream cleanup failed:', result.error);
        }
        
        console.log('🧹 ===== CRON JOB: Stream cleanup finished =====\n');
    } catch (error) {
        console.error('❌ CRON JOB: Error during stream cleanup:', error);
    }
}

export function startStreamCleanupCron() {
    console.log('⏰ Starting stream cleanup cron job (every hour)...');
    
    // Run every hour
    cron.schedule('0 * * * *', cleanupStreams, {
        scheduled: true,
        timezone: "UTC"
    });

    console.log('🚀 Executing initial stream cleanup...');
    cleanupStreams();

    console.log('✅ Stream cleanup cron job started successfully');
}

export function stopStreamCleanupCron() {
    console.log('⏹️ Stopping stream cleanup cron job');
}


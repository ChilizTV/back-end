import { MatchService } from '../services';
import cron from 'node-cron';

const matchService = new MatchService();

async function syncMatches() {
    try {
        console.log('Starting match synchronization...');
        const result = await matchService.syncMatchesFromApi();
        
        if (result.errorCode === 0) {
            console.log('Match synchronization completed successfully');
        } else {
            console.error('Match synchronization failed');
        }
    } catch (error) {
        console.error('Error during match synchronization:', error);
    }
}

export function startMatchSyncCron() {
    cron.schedule('*/10 * * * *', syncMatches, {
        scheduled: true,
        timezone: "UTC"
    });

    syncMatches();

    console.log('Match synchronization cron job started');
}

export function stopMatchSyncCron() {
    console.log('Stopping match synchronization cron job');
} 
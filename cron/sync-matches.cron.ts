import { MatchService } from '../services';
import { ChatService } from '../services/chat.service';
import cron from 'node-cron';

const matchService = new MatchService();
const chatService = new ChatService();

async function syncMatches() {
    try {
        console.log('🔄 ===== CRON JOB: Starting match synchronization =====');
        const startTime = Date.now();
        
        const result = await matchService.refetchMatchesFromApi();
        
        // Dynamic chat room management
        const cacheStats = matchService.getCacheStats();
        const matches = matchService['matchesCache'] || [];
        const now = new Date();
        const past24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        // Create a room for each upcoming, live, or finished match within the last 24h
        matches.forEach(match => {
            const matchDate = new Date(match.match_date);
            const isFutureOrLive = matchDate >= past24h && matchDate <= now || match.status === 'scheduled' || match.status === 'live';
            if (isFutureOrLive) {
                chatService.createRoomIfNotExists(match.id);
            }
        });

        // Remove rooms for matches finished more than 24h ago
        // We consider all matches in cache + we can keep track of existing rooms
        chatService['chatRooms'].forEach((_, matchId) => {
            const match = matches.find(m => m.id === matchId);
            if (!match) {
                // If the match is no longer in cache, we delete the room
                chatService.deleteRoom(matchId);
                return;
            }
            const matchDate = new Date(match.match_date);
            const isOldFinished = match.status === 'finished' && matchDate < past24h;
            if (isOldFinished) {
                chatService.deleteRoom(matchId);
            }
        });

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
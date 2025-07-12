import Gun from 'gun';
import { ServiceResult } from './service.result';
import { ChatMessage, ChatRoom, BetMessage, SystemMessage } from '../models/chat.model';
import { MatchWithOdds } from '../models';
import { TokenBalanceService } from './token-balance.service';

export class ChatService {
    private gun: any;
    private chatRooms: Map<number, any> = new Map();
    private connectedUsers: Map<string, { matchId: number; username: string }> = new Map();
    private tokenBalanceService: TokenBalanceService;

    constructor() {
        // Use the global Gun instance from the server
        this.gun = (global as any).gun || Gun({
            web: require('http').createServer(),
            multicast: false
        });

        this.tokenBalanceService = new TokenBalanceService();

        console.log('🚀 Chat service initialized with Gun.js and Token Balance Service');
    }

    public createRoomIfNotExists(matchId: number): void {
        if (!this.chatRooms.has(matchId)) {
            const room = this.gun.get(`chat-rooms/${matchId}`);
            this.chatRooms.set(matchId, room);
            room.get('messages').put({});
            console.log(`🏟️ [AUTO] Created chat room for match ${matchId}`);
        }
    }

    public deleteRoom(matchId: number): void {
        if (this.chatRooms.has(matchId)) {
            const room = this.chatRooms.get(matchId);
            room.get('messages').put(null);
            this.chatRooms.delete(matchId);
            console.log(`🗑️ [AUTO] Deleted chat room for match ${matchId}`);
        } else {
            this.gun.get(`chat-rooms/${matchId}`).put(null);
            console.log(`🗑️ [AUTO] Deleted chat room (not in cache) for match ${matchId}`);
        }
    }

    private getChatRoom(matchId: number): any {
        if (!this.chatRooms.has(matchId)) {
            const room = this.gun.get(`chat-rooms/${matchId}`);
            this.chatRooms.set(matchId, room);
            console.log(`🏟️ Created chat room for match ${matchId}`);
        }
        return this.chatRooms.get(matchId);
    }

    private generateMessageId(): string {
        return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private async checkUserFeaturedStatus(walletAddress: string): Promise<boolean> {
        try {
            const balances = await this.tokenBalanceService.getUserTokenBalances(walletAddress);
            const totalBalance = Object.values(balances).reduce((sum: number, balance: any) => sum + (balance || 0), 0);
            return totalBalance >= 50;
        } catch (error) {
            console.error('❌ Error checking user featured status:', error);
            return false;
        }
    }

    async sendMessage(matchId: number, userId: string, username: string, message: string, walletAddress: string): Promise<ServiceResult<ChatMessage>> {
        try {
            console.log(`💬 User ${username} sending message to match ${matchId}`);
            
            const isFeatured = await this.checkUserFeaturedStatus(walletAddress);
            
            const chatMessage: ChatMessage = {
                id: this.generateMessageId(),
                matchId,
                userId,
                walletAddress,
                username,
                message,
                timestamp: Date.now(),
                type: 'message',
                isFeatured
            };

            const room = this.getChatRoom(matchId);
            const messages = room.get('messages');
            
            // Use a more controlled approach to avoid infinite loops
            try {
                messages.get(chatMessage.id).put(chatMessage);
                console.log(`✅ Message sent to match ${matchId}: ${message.substring(0, 50)}... (Featured: ${isFeatured})`);
                return ServiceResult.success(chatMessage);
            } catch (gunError) {
                console.error('❌ Gun.js error:', gunError);
                // Fallback: return the message even if Gun.js fails
                console.log(`⚠️ Gun.js failed, but message created: ${message.substring(0, 50)}...`);
                return ServiceResult.success(chatMessage);
            }
        } catch (error) {
            console.error('❌ Error sending message:', error);
            return ServiceResult.failed();
        }
    }

    async sendBetMessage(matchId: number, userId: string, username: string, betType: string, betSubType: string, amount: number, odds: number, walletAddress: string): Promise<ServiceResult<BetMessage>> {
        try {
            console.log(`💰 User ${username} placing bet on match ${matchId}: ${betType} - ${betSubType} - ${amount}$ @ ${odds}`);
            
            // Force all bet messages to be featured
            const isFeatured = true;
            
            let betDescription = '';
            
            switch (betType) {
                case 'match_winner':
                    betDescription = `${username} bet ${amount}$ on ${betSubType === 'home' ? 'home win' : betSubType === 'draw' ? 'draw' : 'away win'} @ ${odds}`;
                    break;
                case 'over_under':
                    betDescription = `${username} bet ${amount}$ on ${betSubType.includes('over') ? 'over' : 'under'} ${betSubType.replace('over_', '').replace('under_', '').replace('_', '.')} goals @ ${odds}`;
                    break;
                case 'both_teams_score':
                    betDescription = `${username} bet ${amount}$ on ${betSubType === 'yes' ? 'both teams score' : 'one team does not score'} @ ${odds}`;
                    break;
                case 'double_chance':
                    betDescription = `${username} bet ${amount}$ on ${betSubType === 'home_or_draw' ? 'home win or draw' : betSubType === 'home_or_away' ? 'home win or away win' : 'draw or away win'} @ ${odds}`;
                    break;
                case 'draw_no_bet':
                    betDescription = `${username} bet ${amount}$ on ${betSubType === 'home' ? 'home win (no draw)' : 'away win (no draw)'} @ ${odds}`;
                    break;
                case 'first_half_winner':
                    betDescription = `${username} bet ${amount}$ on ${betSubType === 'home' ? 'home win first half' : betSubType === 'draw' ? 'draw first half' : 'away win first half'} @ ${odds}`;
                    break;
                case 'first_half_goals':
                    betDescription = `${username} bet ${amount}$ on ${betSubType.includes('over') ? 'over' : 'under'} ${betSubType.replace('over_', '').replace('under_', '').replace('_', '.')} goals first half @ ${odds}`;
                    break;
                case 'ht_ft':
                    betDescription = `${username} bet ${amount}$ on ${betSubType} @ ${odds}`;
                    break;
                case 'correct_score':
                    betDescription = `${username} bet ${amount}$ on exact score ${betSubType} @ ${odds}`;
                    break;
                case 'exact_goals_number':
                    betDescription = `${username} bet ${amount}$ on exactly ${betSubType} goals @ ${odds}`;
                    break;
                case 'goalscorers':
                    betDescription = `${username} bet ${amount}$ on ${betSubType} first goalscorer @ ${odds}`;
                    break;
                case 'clean_sheet':
                    betDescription = `${username} bet ${amount}$ on ${betSubType.includes('home') ? 'home' : 'away'} ${betSubType.includes('yes') ? 'keeps clean sheet' : 'does not keep clean sheet'} @ ${odds}`;
                    break;
                case 'win_to_nil':
                    betDescription = `${username} bet ${amount}$ on ${betSubType.includes('home') ? 'home' : 'away'} ${betSubType.includes('yes') ? 'wins without conceding' : 'does not win without conceding'} @ ${odds}`;
                    break;
                case 'highest_scoring_half':
                    betDescription = `${username} bet ${amount}$ on ${betSubType === 'first_half' ? 'first half' : betSubType === 'second_half' ? 'second half' : 'equal halves'} @ ${odds}`;
                    break;
                case 'odd_even_goals':
                    betDescription = `${username} bet ${amount}$ on ${betSubType === 'odd' ? 'odd' : 'even'} number of goals @ ${odds}`;
                    break;
                case 'first_half_odd_even':
                    betDescription = `${username} bet ${amount}$ on ${betSubType === 'odd' ? 'odd' : 'even'} number of goals first half @ ${odds}`;
                    break;
                default:
                    betDescription = `${username} bet ${amount}$ on ${betType} - ${betSubType} @ ${odds}`;
            }
            
            const betMessage: BetMessage = {
                id: this.generateMessageId(),
                matchId,
                userId,
                walletAddress,
                username,
                message: betDescription,
                timestamp: Date.now(),
                type: 'bet',
                betType: betType as any,
                betSubType,
                amount,
                odds,
                isFeatured
            };

            const room = this.getChatRoom(matchId);
            const messages = room.get('messages');
            
            messages.get(betMessage.id).put(betMessage);

            console.log(`✅ Bet message sent to match ${matchId} (Featured: ${isFeatured})`);
            return ServiceResult.success(betMessage);
        } catch (error) {
            console.error('❌ Error sending bet message:', error);
            return ServiceResult.failed();
        }
    }

    async sendSystemMessage(matchId: number, systemType: 'match_start' | 'match_end' | 'goal' | 'user_joined' | 'user_left', data?: any): Promise<ServiceResult<SystemMessage>> {
        try {
            console.log(`🔔 Sending system message to match ${matchId}: ${systemType}`);
            
            let message = '';
            switch (systemType) {
                case 'match_start':
                    message = '⚽ Match is starting!';
                    break;
                case 'match_end':
                    message = '🏁 Match is finished!';
                    break;
                case 'goal':
                    message = `⚽ GOAL! ${data?.team} - ${data?.score}`;
                    break;
                case 'user_joined':
                    message = `👋 ${data?.username} joined the chat`;
                    break;
                case 'user_left':
                    message = `👋 ${data?.username} left the chat`;
                    break;
            }

            const systemMessage: SystemMessage = {
                id: this.generateMessageId(),
                matchId,
                userId: 'system',
                walletAddress: 'system',
                username: 'System',
                message,
                timestamp: Date.now(),
                type: 'system',
                systemType,
                data,
                isFeatured: false
            };

            const room = this.getChatRoom(matchId);
            const messages = room.get('messages');
            
            messages.get(systemMessage.id).put(systemMessage);

            console.log(`✅ System message sent to match ${matchId}`);
            return ServiceResult.success(systemMessage);
        } catch (error) {
            console.error('❌ Error sending system message:', error);
            return ServiceResult.failed();
        }
    }

    async joinRoom(matchId: number, userId: string, username: string): Promise<ServiceResult<unknown>> {
        try {
            console.log(`👋 User ${username} joining match ${matchId}`);
            
            this.connectedUsers.set(userId, { matchId, username });
            
            // Send system message
            await this.sendSystemMessage(matchId, 'user_joined', { username });
            
            console.log(`✅ User ${username} joined match ${matchId}`);
            return ServiceResult.success({ userId, username, matchId });
        } catch (error) {
            console.error('❌ Error joining room:', error);
            return ServiceResult.failed();
        }
    }

    async leaveRoom(matchId: number, userId: string, username: string): Promise<ServiceResult<unknown>> {
        try {
            console.log(`👋 User ${username} leaving match ${matchId}`);
            
            this.connectedUsers.delete(userId);
            
            // Send system message
            await this.sendSystemMessage(matchId, 'user_left', { username });
            
            console.log(`✅ User ${username} left match ${matchId}`);
            return ServiceResult.success({ userId, username, matchId });
        } catch (error) {
            console.error('❌ Error leaving room:', error);
            return ServiceResult.failed();
        }
    }

    async getRoomMessages(matchId: number): Promise<ServiceResult<ChatMessage[]>> {
        try {
            console.log(`📋 Getting messages for match ${matchId}`);
            
            const room = this.getChatRoom(matchId);
            const messages = room.get('messages');
            
            return new Promise((resolve) => {
                const messagesList: ChatMessage[] = [];
                let messageCount = 0;
                
                // Use a more controlled approach to avoid infinite loops
                messages.map().once((message: ChatMessage, key: string) => {
                    if (message && message.id && typeof message === 'object' && message.message) {
                        console.log(`📨 Message from match ${matchId}: ${message.message.substring(0, 30)}... (Featured: ${message.isFeatured})`);
                        messagesList.push(message);
                        messageCount++;
                    }
                });
                
                // Use a shorter timeout and add a maximum retry count
                const maxRetries = 3;
                let retryCount = 0;
                
                const checkMessages = () => {
                    if (messageCount > 0 || retryCount >= maxRetries) {
                        console.log(`📊 Found ${messagesList.length} messages for match ${matchId} after ${retryCount} retries`);
                        resolve(ServiceResult.success(messagesList));
                    } else {
                        retryCount++;
                        setTimeout(checkMessages, 200);
                    }
                };
                
                setTimeout(checkMessages, 200);
            });
        } catch (error) {
            console.error('❌ Error getting room messages:', error);
            return ServiceResult.failed();
        }
    }

    async getConnectedUsers(matchId: number): Promise<ServiceResult<string[]>> {
        try {
            console.log(`👥 Getting connected users for match ${matchId}`);
            
            const users = Array.from(this.connectedUsers.values())
                .filter(user => user.matchId === matchId)
                .map(user => user.username);
            
            console.log(`✅ Found ${users.length} connected users for match ${matchId}`);
            return ServiceResult.success(users);
        } catch (error) {
            console.error('❌ Error getting connected users:', error);
            return ServiceResult.failed();
        }
    }

    async getUserTokenBalances(walletAddress: string): Promise<{ [key: string]: number }> {
        try {
            console.log(`💰 Getting token balances for wallet ${walletAddress}`);
            const result = await this.tokenBalanceService.getUserTokenBalances(walletAddress);
            
            if (result.errorCode === 0 && result.result) {
                const balances: { [key: string]: number } = {};
                result.result.tokenBalances.forEach(tokenBalance => {
                    balances[tokenBalance.token.symbol] = tokenBalance.balance;
                });
                return balances;
            }
            
            return {};
        } catch (error) {
            console.error('❌ Error getting user token balances:', error);
            return {};
        }
    }

    getGunInstance(): any {
        return this.gun;
    }

    getStats(): { 
        connectedUsers: number; 
        activeRooms: number;
    } {
        return {
            connectedUsers: this.connectedUsers.size,
            activeRooms: this.chatRooms.size
        };
    }
} 
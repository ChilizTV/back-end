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
            const result = await this.tokenBalanceService.isUserFeatured(walletAddress);
            if (result.errorCode === 0) {
                return result.result!;
            }
            return false;
        } catch (error) {
            console.error('❌ Error checking featured status:', error);
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
            console.log(`💰 User ${username} placing bet on match ${matchId}: ${betType} - ${betSubType} - ${amount}€ @ ${odds}`);
            
            const isFeatured = await this.checkUserFeaturedStatus(walletAddress);
            
            let betDescription = '';
            
            switch (betType) {
                case 'match_winner':
                    betDescription = `${username} a parié ${amount}€ sur ${betSubType === 'home' ? 'victoire domicile' : betSubType === 'draw' ? 'match nul' : 'victoire extérieur'} @ ${odds}`;
                    break;
                case 'over_under':
                    betDescription = `${username} a parié ${amount}€ sur ${betSubType.includes('over') ? 'plus de' : 'moins de'} ${betSubType.replace('over_', '').replace('under_', '').replace('_', '.')} buts @ ${odds}`;
                    break;
                case 'both_teams_score':
                    betDescription = `${username} a parié ${amount}€ sur ${betSubType === 'yes' ? 'les deux équipes marquent' : 'une équipe ne marque pas'} @ ${odds}`;
                    break;
                case 'double_chance':
                    betDescription = `${username} a parié ${amount}€ sur ${betSubType === 'home_or_draw' ? 'victoire domicile ou nul' : betSubType === 'home_or_away' ? 'victoire domicile ou extérieur' : 'nul ou victoire extérieur'} @ ${odds}`;
                    break;
                case 'draw_no_bet':
                    betDescription = `${username} a parié ${amount}€ sur ${betSubType === 'home' ? 'victoire domicile (sans nul)' : 'victoire extérieur (sans nul)'} @ ${odds}`;
                    break;
                case 'first_half_winner':
                    betDescription = `${username} a parié ${amount}€ sur ${betSubType === 'home' ? 'victoire domicile mi-temps' : betSubType === 'draw' ? 'nul mi-temps' : 'victoire extérieur mi-temps'} @ ${odds}`;
                    break;
                case 'first_half_goals':
                    betDescription = `${username} a parié ${amount}€ sur ${betSubType.includes('over') ? 'plus de' : 'moins de'} ${betSubType.replace('over_', '').replace('under_', '').replace('_', '.')} buts mi-temps @ ${odds}`;
                    break;
                case 'ht_ft':
                    betDescription = `${username} a parié ${amount}€ sur ${betSubType} @ ${odds}`;
                    break;
                case 'correct_score':
                    betDescription = `${username} a parié ${amount}€ sur le score exact ${betSubType} @ ${odds}`;
                    break;
                case 'exact_goals_number':
                    betDescription = `${username} a parié ${amount}€ sur ${betSubType} buts exacts @ ${odds}`;
                    break;
                case 'goalscorers':
                    betDescription = `${username} a parié ${amount}€ sur ${betSubType} premier buteur @ ${odds}`;
                    break;
                case 'clean_sheet':
                    betDescription = `${username} a parié ${amount}€ sur ${betSubType.includes('home') ? 'domicile' : 'extérieur'} ${betSubType.includes('yes') ? 'garde sa cage inviolée' : 'ne garde pas sa cage inviolée'} @ ${odds}`;
                    break;
                case 'win_to_nil':
                    betDescription = `${username} a parié ${amount}€ sur ${betSubType.includes('home') ? 'domicile' : 'extérieur'} ${betSubType.includes('yes') ? 'gagne sans encaisser' : 'ne gagne pas sans encaisser'} @ ${odds}`;
                    break;
                case 'highest_scoring_half':
                    betDescription = `${username} a parié ${amount}€ sur ${betSubType === 'first_half' ? 'première mi-temps' : betSubType === 'second_half' ? 'deuxième mi-temps' : 'mi-temps égales'} @ ${odds}`;
                    break;
                case 'odd_even_goals':
                    betDescription = `${username} a parié ${amount}€ sur ${betSubType === 'odd' ? 'nombre impair' : 'nombre pair'} de buts @ ${odds}`;
                    break;
                case 'first_half_odd_even':
                    betDescription = `${username} a parié ${amount}€ sur ${betSubType === 'odd' ? 'nombre impair' : 'nombre pair'} de buts mi-temps @ ${odds}`;
                    break;
                default:
                    betDescription = `${username} a parié ${amount}€ sur ${betType} - ${betSubType} @ ${odds}`;
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
                    message = '⚽ Le match commence !';
                    break;
                case 'match_end':
                    message = '🏁 Le match est terminé !';
                    break;
                case 'goal':
                    message = `⚽ GOAL! ${data?.team} - ${data?.score}`;
                    break;
                case 'user_joined':
                    message = `👋 ${data?.username} a rejoint le chat`;
                    break;
                case 'user_left':
                    message = `👋 ${data?.username} a quitté le chat`;
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

    async joinRoom(matchId: number, userId: string, username: string): Promise<ServiceResult<void>> {
        try {
            console.log(`👤 User ${username} joining match ${matchId}`);
            
            this.connectedUsers.set(userId, { matchId, username });
            
            await this.sendSystemMessage(matchId, 'user_joined', { username });
            
            console.log(`✅ User ${username} joined match ${matchId}`);
            return ServiceResult.success(undefined);
        } catch (error) {
            console.error('❌ Error joining room:', error);
            return ServiceResult.failed();
        }
    }

    async leaveRoom(matchId: number, userId: string, username: string): Promise<ServiceResult<void>> {
        try {
            console.log(`👤 User ${username} leaving match ${matchId}`);
            
            this.connectedUsers.delete(userId);
            
            await this.sendSystemMessage(matchId, 'user_left', { username });
            
            console.log(`✅ User ${username} left match ${matchId}`);
            return ServiceResult.success(undefined);
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
            const users = Array.from(this.connectedUsers.values())
                .filter(user => user.matchId === matchId)
                .map(user => user.username);
            
            console.log(`👥 Connected users for match ${matchId}: ${users.join(', ')}`);
            return ServiceResult.success(users);
        } catch (error) {
            console.error('❌ Error getting connected users:', error);
            return ServiceResult.failed();
        }
    }

    async getUserTokenBalances(walletAddress: string): Promise<ServiceResult<any>> {
        try {
            const result = await this.tokenBalanceService.getUserTokenBalances(walletAddress);
            return result;
        } catch (error) {
            console.error('❌ Error getting user token balances:', error);
            return ServiceResult.failed();
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
import Gun from 'gun';
import { ServiceResult } from './service.result';
import { ChatMessage, ChatRoom, BetMessage, SystemMessage } from '../models/chat.model';
import { MatchWithOdds } from '../models';

export class ChatService {
    private gun: any;
    private chatRooms: Map<number, any> = new Map();
    private connectedUsers: Map<string, { matchId: number; username: string }> = new Map();

    constructor() {
        this.gun = Gun({
            web: require('http').createServer(),
            multicast: false
        });

        console.log('🚀 Chat service initialized with Gun.js');
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

    async sendMessage(matchId: number, userId: string, username: string, message: string): Promise<ServiceResult<ChatMessage>> {
        try {
            console.log(`💬 User ${username} sending message to match ${matchId}`);
            
            const chatMessage: ChatMessage = {
                id: this.generateMessageId(),
                matchId,
                userId,
                username,
                message,
                timestamp: Date.now(),
                type: 'message'
            };

            const room = this.getChatRoom(matchId);
            const messages = room.get('messages');
            
            messages.get(chatMessage.id).put(chatMessage);

            console.log(`✅ Message sent to match ${matchId}: ${message.substring(0, 50)}...`);
            return ServiceResult.success(chatMessage);
        } catch (error) {
            console.error('❌ Error sending message:', error);
            return ServiceResult.failed();
        }
    }

    async sendBetMessage(matchId: number, userId: string, username: string, betType: 'home_win' | 'draw' | 'away_win', amount: number, odds: number): Promise<ServiceResult<BetMessage>> {
        try {
            console.log(`💰 User ${username} placing bet on match ${matchId}: ${betType} - ${amount}€ @ ${odds}`);
            
            const betMessage: BetMessage = {
                id: this.generateMessageId(),
                matchId,
                userId,
                username,
                message: `${username} a parié ${amount}€ sur ${betType === 'home_win' ? 'victoire domicile' : betType === 'draw' ? 'match nul' : 'victoire extérieur'} @ ${odds}`,
                timestamp: Date.now(),
                type: 'bet',
                betType,
                amount,
                odds
            };

            const room = this.getChatRoom(matchId);
            const messages = room.get('messages');
            
            messages.get(betMessage.id).put(betMessage);

            console.log(`✅ Bet message sent to match ${matchId}`);
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
                username: 'System',
                message,
                timestamp: Date.now(),
                type: 'system',
                systemType,
                data
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
                
                messages.map().once((message: ChatMessage, key: string) => {
                    if (message && message.id) {
                        console.log(`📨 Message from match ${matchId}: ${message.message.substring(0, 30)}...`);
                        messagesList.push(message);
                    }
                });
                
                setTimeout(() => {
                    console.log(`📊 Found ${messagesList.length} messages for match ${matchId}`);
                    resolve(ServiceResult.success(messagesList));
                }, 100);
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
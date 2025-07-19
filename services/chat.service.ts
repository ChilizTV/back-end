import { supabase } from '../config/supabase';
import { ServiceResult } from './service.result';
import { 
    ChatMessage, 
    ChatRoom, 
    BetMessage, 
    SystemMessage, 
    ConnectedUser,
    SupabaseChatMessage,
    SupabaseConnectedUser,
    ChatStats,
    MessageFilter,
    PaginatedResult
} from '../models/chat.model';
import { MessageType, SystemMessageType, BetType } from '../enums';
import { TokenBalanceService } from './token-balance.service';

export class ChatService {
    private tokenBalanceService: TokenBalanceService;
    private connectedUsers: Map<string, { matchId: number; username: string }> = new Map();

    constructor() {
        this.tokenBalanceService = new TokenBalanceService();
        console.log('🚀 Supabase Chat service initialized');
    }

    private generateMessageId(): string {
        return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private async checkUserFeaturedStatus(walletAddress: string): Promise<boolean> {
        try {
            console.log(`🔍 Checking featured status for wallet: ${walletAddress}`);
            
            const result = await this.tokenBalanceService.getUserTokenBalances(walletAddress);
            
            if (result.errorCode === 0 && result.result) {
                const userBalance = result.result as {
                    walletAddress: string;
                    totalBalance: number;
                    tokenBalances: Array<{
                        token: { symbol: string };
                        balance: number;
                    }>;
                    isFeatured: boolean;
                };
                
                console.log(`💰 User balance: ${userBalance.totalBalance} tokens, Featured: ${userBalance.isFeatured}`);
                return userBalance.isFeatured;
            } else {
                console.log(`❌ Failed to get token balances for wallet: ${walletAddress}`);
                return false;
            }
        } catch (error) {
            console.error('❌ Error checking user featured status:', error);
            return false;
        }
    }

    async sendMessage(matchId: number, userId: string, username: string, message: string, walletAddress: string): Promise<ServiceResult<ChatMessage>> {
        try {
            console.log(`💬 User ${username} sending message to match ${matchId}`);
            
            const isFeatured = await this.checkUserFeaturedStatus(walletAddress);
            
            const chatMessage: Partial<SupabaseChatMessage> = {
                match_id: matchId,
                user_id: userId,
                wallet_address: walletAddress,
                username,
                message,
                message_type: MessageType.MESSAGE,
                is_featured: isFeatured
            };

            const { data, error } = await supabase
                .from('chat_messages')
                .insert(chatMessage)
                .select()
                .single();

            if (error) {
                console.error('❌ Supabase error:', error);
                throw error;
            }

            console.log(`✅ Message sent to match ${matchId}: ${message.substring(0, 50)}... (Featured: ${isFeatured})`);
            return ServiceResult.success(this.mapToChatMessage(data));
        } catch (error) {
            console.error('❌ Error sending message:', error);
            return ServiceResult.failed();
        }
    }

    async sendBetMessage(matchId: number, userId: string, username: string, betType: BetType, betSubType: string, amount: number, odds: number, walletAddress: string): Promise<ServiceResult<BetMessage>> {
        try {
            console.log(`💰 User ${username} placing bet on match ${matchId}: ${betType} - ${betSubType} - ${amount}$ @ ${odds}`);
            
            const betDescription = this.generateBetDescription(username, betType, betSubType, amount, odds);
            
            const betMessage: Partial<SupabaseChatMessage> = {
                match_id: matchId,
                user_id: userId,
                wallet_address: walletAddress,
                username,
                message: betDescription,
                message_type: MessageType.BET,
                is_featured: true,
                bet_type: betType,
                bet_sub_type: betSubType,
                amount,
                odds
            };

            const { data, error } = await supabase
                .from('chat_messages')
                .insert(betMessage)
                .select()
                .single();

            if (error) {
                console.error('❌ Supabase error:', error);
                throw error;
            }

            console.log(`✅ Bet message sent to match ${matchId}`);
            return ServiceResult.success(this.mapToBetMessage(data));
        } catch (error) {
            console.error('❌ Error sending bet message:', error);
            return ServiceResult.failed();
        }
    }

    async sendSystemMessage(matchId: number, systemType: SystemMessageType, data?: any): Promise<ServiceResult<SystemMessage>> {
        try {
            console.log(`🔔 Sending system message to match ${matchId}: ${systemType}`);
            
            const message = this.generateSystemMessage(systemType, data);
            
            const systemMessage: Partial<SupabaseChatMessage> = {
                match_id: matchId,
                user_id: 'system',
                wallet_address: 'system',
                username: 'System',
                message,
                message_type: MessageType.SYSTEM,
                is_featured: false,
                system_type: systemType,
                system_data: data
            };

            const { data: result, error } = await supabase
                .from('chat_messages')
                .insert(systemMessage)
                .select()
                .single();

            if (error) {
                console.error('❌ Supabase error:', error);
                throw error;
            }

            console.log(`✅ System message sent to match ${matchId}`);
            return ServiceResult.success(this.mapToSystemMessage(result));
        } catch (error) {
            console.error('❌ Error sending system message:', error);
            return ServiceResult.failed();
        }
    }

    async joinRoom(matchId: number, userId: string, username: string): Promise<ServiceResult<ConnectedUser>> {
        try {
            console.log(`👋 User ${username} joining match ${matchId}`);
            
            this.connectedUsers.set(userId, { matchId, username });
            
            // Add to connected users table
            const connectedUser: Partial<SupabaseConnectedUser> = {
                match_id: matchId,
                user_id: userId,
                username
            };

            const { data, error: connectError } = await supabase
                .from('chat_connected_users')
                .upsert(connectedUser)
                .select()
                .single();

            if (connectError) {
                console.error('❌ Error adding user to connected users:', connectError);
            }

            // Send system message
            await this.sendSystemMessage(matchId, SystemMessageType.USER_JOINED, { username });
            
            console.log(`✅ User ${username} joined match ${matchId}`);
            return ServiceResult.success(this.mapToConnectedUser(data));
        } catch (error) {
            console.error('❌ Error joining room:', error);
            return ServiceResult.failed();
        }
    }

    async leaveRoom(matchId: number, userId: string, username: string): Promise<ServiceResult<ConnectedUser>> {
        try {
            console.log(`👋 User ${username} leaving match ${matchId}`);
            
            this.connectedUsers.delete(userId);
            
            // Remove from connected users table
            const { data, error } = await supabase
                .from('chat_connected_users')
                .delete()
                .eq('match_id', matchId)
                .eq('user_id', userId)
                .select()
                .single();

            if (error) {
                console.error('❌ Error removing user from connected users:', error);
            }

            // Send system message
            await this.sendSystemMessage(matchId, SystemMessageType.USER_LEFT, { username });
            
            console.log(`✅ User ${username} left match ${matchId}`);
            return ServiceResult.success(this.mapToConnectedUser(data));
        } catch (error) {
            console.error('❌ Error leaving room:', error);
            return ServiceResult.failed();
        }
    }

    async getRoomMessages(matchId: number, filter?: MessageFilter): Promise<ServiceResult<ChatMessage[]>> {
        try {
            console.log(`📋 Getting messages for match ${matchId}`);
            
            let query = supabase
                .from('chat_messages')
                .select('*')
                .eq('match_id', matchId);

            // Apply filters if provided
            if (filter) {
                if (filter.userId) {
                    query = query.eq('user_id', filter.userId);
                }
                if (filter.messageType) {
                    query = query.eq('message_type', filter.messageType);
                }
                if (filter.isFeatured !== undefined) {
                    query = query.eq('is_featured', filter.isFeatured);
                }
                if (filter.startDate) {
                    query = query.gte('created_at', filter.startDate.toISOString());
                }
                if (filter.endDate) {
                    query = query.lte('created_at', filter.endDate.toISOString());
                }
                if (filter.limit) {
                    query = query.limit(filter.limit);
                }
                if (filter.offset) {
                    query = query.range(filter.offset, filter.offset + (filter.limit || 50) - 1);
                }
            }

            query = query.order('created_at', { ascending: true });

            const { data, error } = await query;

            if (error) {
                console.error('❌ Supabase error:', error);
                throw error;
            }

            const messages = data.map(msg => this.mapToChatMessage(msg));
            console.log(`📊 Found ${messages.length} messages for match ${matchId}`);
            
            return ServiceResult.success(messages);
        } catch (error) {
            console.error('❌ Error getting room messages:', error);
            return ServiceResult.failed();
        }
    }

    async getConnectedUsers(matchId: number): Promise<ServiceResult<ConnectedUser[]>> {
        try {
            console.log(`👥 Getting connected users for match ${matchId}`);
            
            const { data, error } = await supabase
                .from('chat_connected_users')
                .select('*')
                .eq('match_id', matchId);

            if (error) {
                console.error('❌ Supabase error:', error);
                throw error;
            }

            const users = data.map(user => this.mapToConnectedUser(user));
            console.log(`👥 Found ${users.length} connected users for match ${matchId}`);
            
            return ServiceResult.success(users);
        } catch (error) {
            console.error('❌ Error getting connected users:', error);
            return ServiceResult.failed();
        }
    }

    async getUserTokenBalances(walletAddress: string): Promise<{ [key: string]: number }> {
        try {
            const result = await this.tokenBalanceService.getUserTokenBalances(walletAddress);
            if (result.errorCode === 0 && result.result) {
                return result.result as unknown as { [key: string]: number };
            }
            return {};
        } catch (error) {
            console.error('❌ Error getting user token balances:', error);
            return {};
        }
    }

    getStats(): ChatStats {
        const connectedUsersCount = this.connectedUsers.size;
        const activeRoomsCount = new Set(Array.from(this.connectedUsers.values()).map(u => u.matchId)).size;
        
        return {
            connectedUsers: connectedUsersCount,
            activeRooms: activeRoomsCount,
            totalMessages: 0, // Todo be implemented with a counter
            featuredMessages: 0 // Todo be implemented with a counter
        };
    }

    // Utility mapping methods
    private mapToChatMessage(data: SupabaseChatMessage): ChatMessage {
        return {
            id: data.id,
            matchId: data.match_id,
            userId: data.user_id,
            walletAddress: data.wallet_address,
            username: data.username,
            message: data.message,
            timestamp: new Date(data.created_at).getTime(),
            type: data.message_type,
            isFeatured: data.is_featured
        };
    }

    private mapToBetMessage(data: SupabaseChatMessage): BetMessage {
        return {
            ...this.mapToChatMessage(data),
            betType: data.bet_type as BetType,
            betSubType: data.bet_sub_type,
            amount: data.amount || 0,
            odds: data.odds || 0,
            type: MessageType.BET
        };
    }

    private mapToSystemMessage(data: SupabaseChatMessage): SystemMessage {
        return {
            ...this.mapToChatMessage(data),
            systemType: data.system_type as SystemMessageType,
            data: data.system_data,
            type: MessageType.SYSTEM
        };
    }

    private mapToConnectedUser(data: SupabaseConnectedUser): ConnectedUser {
        return {
            id: data.id,
            matchId: data.match_id,
            userId: data.user_id,
            username: data.username,
            connectedAt: new Date(data.connected_at).getTime(),
            lastActivity: new Date(data.last_activity).getTime()
        };
    }

    // Utility methods
    private generateBetDescription(username: string, betType: BetType, betSubType: string, amount: number, odds: number): string {
        let betDescription = '';
        
        switch (betType) {
            case BetType.MATCH_WINNER:
                betDescription = `${username} bet ${amount}$ on ${betSubType === 'home' ? 'home win' : betSubType === 'draw' ? 'draw' : 'away win'} @ ${odds}`;
                break;
            case BetType.OVER_UNDER:
                betDescription = `${username} bet ${amount}$ on ${betSubType.includes('over') ? 'over' : 'under'} ${betSubType.replace('over_', '').replace('under_', '').replace('_', '.')} goals @ ${odds}`;
                break;
            case BetType.BOTH_TEAMS_SCORE:
                betDescription = `${username} bet ${amount}$ on ${betSubType === 'yes' ? 'both teams score' : 'one team does not score'} @ ${odds}`;
                break;
            case BetType.DOUBLE_CHANCE:
                betDescription = `${username} bet ${amount}$ on ${betSubType === 'home_or_draw' ? 'home win or draw' : betSubType === 'home_or_away' ? 'home win or away win' : 'draw or away win'} @ ${odds}`;
                break;
            case BetType.DRAW_NO_BET:
                betDescription = `${username} bet ${amount}$ on ${betSubType === 'home' ? 'home win (no draw)' : 'away win (no draw)'} @ ${odds}`;
                break;
            case BetType.FIRST_HALF_WINNER:
                betDescription = `${username} bet ${amount}$ on ${betSubType === 'home' ? 'home win first half' : betSubType === 'draw' ? 'draw first half' : 'away win first half'} @ ${odds}`;
                break;
            case BetType.FIRST_HALF_GOALS:
                betDescription = `${username} bet ${amount}$ on ${betSubType.includes('over') ? 'over' : 'under'} ${betSubType.replace('over_', '').replace('under_', '').replace('_', '.')} goals first half @ ${odds}`;
                break;
            case BetType.HT_FT:
                betDescription = `${username} bet ${amount}$ on ${betSubType} @ ${odds}`;
                break;
            case BetType.CORRECT_SCORE:
                betDescription = `${username} bet ${amount}$ on exact score ${betSubType} @ ${odds}`;
                break;
            case BetType.EXACT_GOALS_NUMBER:
                betDescription = `${username} bet ${amount}$ on exactly ${betSubType} goals @ ${odds}`;
                break;
            case BetType.GOALSCORERS:
                betDescription = `${username} bet ${amount}$ on ${betSubType} first goalscorer @ ${odds}`;
                break;
            case BetType.CLEAN_SHEET:
                betDescription = `${username} bet ${amount}$ on ${betSubType.includes('home') ? 'home' : 'away'} ${betSubType.includes('yes') ? 'keeps clean sheet' : 'does not keep clean sheet'} @ ${odds}`;
                break;
            case BetType.WIN_TO_NIL:
                betDescription = `${username} bet ${amount}$ on ${betSubType.includes('home') ? 'home' : 'away'} ${betSubType.includes('yes') ? 'wins without conceding' : 'does not win without conceding'} @ ${odds}`;
                break;
            case BetType.HIGHEST_SCORING_HALF:
                betDescription = `${username} bet ${amount}$ on ${betSubType === 'first_half' ? 'first half' : betSubType === 'second_half' ? 'second half' : 'equal halves'} @ ${odds}`;
                break;
            case BetType.ODD_EVEN_GOALS:
                betDescription = `${username} bet ${amount}$ on ${betSubType === 'odd' ? 'odd' : 'even'} number of goals @ ${odds}`;
                break;
            case BetType.FIRST_HALF_ODD_EVEN:
                betDescription = `${username} bet ${amount}$ on ${betSubType === 'odd' ? 'odd' : 'even'} number of goals first half @ ${odds}`;
                break;
            default:
                betDescription = `${username} bet ${amount}$ on ${betType} - ${betSubType} @ ${odds}`;
        }
        
        return betDescription;
    }

    private generateSystemMessage(systemType: SystemMessageType, data?: any): string {
        let message = '';
        switch (systemType) {
            case SystemMessageType.MATCH_START:
                message = '⚽ Match is starting!';
                break;
            case SystemMessageType.MATCH_END:
                message = '🏁 Match is finished!';
                break;
            case SystemMessageType.GOAL:
                message = `⚽ GOAL! ${data?.team} - ${data?.score}`;
                break;
            case SystemMessageType.USER_JOINED:
                message = `👋 ${data?.username} joined the chat`;
                break;
            case SystemMessageType.USER_LEFT:
                message = `👋 ${data?.username} left the chat`;
                break;
        }
        return message;
    }
} 
import { injectable } from 'tsyringe';
import { supabaseClient as supabase } from '../../database/supabase/client';
import { ChatMessage, MessageType } from '../../../domain/chat/entities/ChatMessage';
import { ConnectedUser } from '../../../domain/chat/entities/ConnectedUser';
import { IChatRepository, ChatStats } from '../../../domain/chat/repositories/IChatRepository';
import { logger } from '../../logging/logger';

interface ChatMessageRow {
  id: string;
  match_id: number;
  user_id: string;
  wallet_address: string;
  username: string;
  message: string;
  message_type: string;
  is_featured: boolean;
  bet_type?: string;
  bet_sub_type?: string;
  amount?: number;
  odds?: number;
  created_at: string;
  updated_at: string;
}

interface ConnectedUserRow {
  id: string;
  match_id: number;
  user_id: string;
  username: string;
  connected_at: string;
  last_activity: string;
}

@injectable()
export class SupabaseChatRepository implements IChatRepository {
  async saveMessage(message: ChatMessage): Promise<ChatMessage> {
    const row = this.messageToRow(message);

    const { data, error } = await supabase
      .from('chat_messages')
      .insert(row)
      .select()
      .single();

    if (error) {
      logger.error('Failed to save chat message', { error: error.message });
      throw new Error('Failed to save message');
    }

    return this.rowToMessage(data);
  }

  async findMessagesByMatchId(matchId: number, limit: number, offset: number): Promise<ChatMessage[]> {
    const { data: rows, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('match_id', matchId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      logger.error('Failed to find messages by match', { error: error.message, matchId });
      throw new Error('Failed to find messages');
    }

    return rows ? rows.map(row => this.rowToMessage(row)) : [];
  }

  async findFeaturedMessages(matchId: number): Promise<ChatMessage[]> {
    const { data: rows, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('match_id', matchId)
      .eq('is_featured', true)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Failed to find featured messages', { error: error.message, matchId });
      throw new Error('Failed to find featured messages');
    }

    return rows ? rows.map(row => this.rowToMessage(row)) : [];
  }

  async addConnectedUser(user: ConnectedUser): Promise<ConnectedUser> {
    const row = this.userToRow(user);

    const { data, error } = await supabase
      .from('connected_users')
      .upsert(row, { onConflict: 'match_id,user_id' })
      .select()
      .single();

    if (error) {
      logger.error('Failed to add connected user', { error: error.message });
      throw new Error('Failed to add user');
    }

    return this.rowToUser(data);
  }

  async removeConnectedUser(matchId: number, userId: string): Promise<void> {
    const { error } = await supabase
      .from('connected_users')
      .delete()
      .eq('match_id', matchId)
      .eq('user_id', userId);

    if (error) {
      logger.error('Failed to remove connected user', { error: error.message, matchId, userId });
      throw new Error('Failed to remove user');
    }
  }

  async findConnectedUsersByMatchId(matchId: number): Promise<ConnectedUser[]> {
    const { data: rows, error } = await supabase
      .from('connected_users')
      .select('*')
      .eq('match_id', matchId)
      .order('connected_at', { ascending: false });

    if (error) {
      logger.error('Failed to find connected users', { error: error.message, matchId });
      throw new Error('Failed to find connected users');
    }

    return rows ? rows.map(row => this.rowToUser(row)) : [];
  }

  async updateUserActivity(matchId: number, userId: string): Promise<void> {
    const { error } = await supabase
      .from('connected_users')
      .update({ last_activity: new Date().toISOString() })
      .eq('match_id', matchId)
      .eq('user_id', userId);

    if (error) {
      logger.error('Failed to update user activity', { error: error.message, matchId, userId });
    }
  }

  async getChatStats(): Promise<ChatStats> {
    const [usersResult, messagesResult] = await Promise.all([
      supabase.from('connected_users').select('match_id', { count: 'exact', head: true }),
      supabase.from('chat_messages').select('is_featured', { count: 'exact', head: true }),
    ]);

    const connectedUsers = usersResult.count || 0;

    const { data: uniqueRooms } = await supabase
      .from('connected_users')
      .select('match_id')
      .order('match_id');

    const activeRooms = uniqueRooms ? new Set(uniqueRooms.map(r => r.match_id)).size : 0;

    const totalMessages = messagesResult.count || 0;

    const { count: featuredCount } = await supabase
      .from('chat_messages')
      .select('*', { count: 'exact', head: true })
      .eq('is_featured', true);

    return {
      connectedUsers,
      activeRooms,
      totalMessages,
      featuredMessages: featuredCount || 0,
    };
  }

  private rowToMessage(row: ChatMessageRow): ChatMessage {
    return ChatMessage.reconstitute({
      id: row.id,
      matchId: row.match_id,
      userId: row.user_id,
      walletAddress: row.wallet_address,
      username: row.username,
      message: row.message,
      timestamp: new Date(row.created_at),
      type: row.message_type as MessageType,
      isFeatured: row.is_featured,
      betType: row.bet_type,
      betSubType: row.bet_sub_type,
      amount: row.amount,
      odds: row.odds,
    });
  }

  private messageToRow(message: ChatMessage): any {
    const json = message.toJSON();
    return {
      id: json.id,
      match_id: json.matchId,
      user_id: json.userId,
      wallet_address: json.walletAddress,
      username: json.username,
      message: json.message,
      message_type: json.type,
      is_featured: json.isFeatured,
      bet_type: json.betType,
      bet_sub_type: json.betSubType,
      amount: json.amount,
      odds: json.odds,
      created_at: new Date(json.timestamp).toISOString(),
      updated_at: new Date(json.timestamp).toISOString(),
    };
  }

  private rowToUser(row: ConnectedUserRow): ConnectedUser {
    return ConnectedUser.reconstitute({
      id: row.id,
      matchId: row.match_id,
      userId: row.user_id,
      username: row.username,
      connectedAt: new Date(row.connected_at),
      lastActivity: new Date(row.last_activity),
    });
  }

  private userToRow(user: ConnectedUser): any {
    const json = user.toJSON();
    return {
      id: json.id,
      match_id: json.matchId,
      user_id: json.userId,
      username: json.username,
      connected_at: new Date(json.connectedAt).toISOString(),
      last_activity: new Date(json.lastActivity).toISOString(),
    };
  }
}

import { MessageType, SystemMessageType, BetType } from '../enums';

// Base message types
export interface ChatMessage {
    id: string;
    matchId: number;
    userId: string;
    walletAddress: string;
    username: string;
    message: string;
    timestamp: number;
    type: MessageType;
    isFeatured: boolean;
}

// Bet message types
export interface BetMessage extends ChatMessage {
    type: MessageType.BET;
    betType: BetType;
    betSubType?: string; // For subtypes like "home", "over_2_5", etc.
    amount: number;
    odds: number;
}

// System message types
export interface SystemMessage extends ChatMessage {
    type: MessageType.SYSTEM;
    systemType: SystemMessageType;
    data?: any;
}

// Connected user types
export interface ConnectedUser {
    id: string;
    matchId: number;
    userId: string;
    username: string;
    connectedAt: number;
    lastActivity: number;
}

// Room types (optional, now managed by Supabase)
export interface ChatRoom {
    matchId: number;
    messages: ChatMessage[];
    participants: string[];
    createdAt: number;
}

// Supabase data types (mapping between DB and API)
export interface SupabaseChatMessage {
    id: string;
    match_id: number;
    user_id: string;
    wallet_address: string;
    username: string;
    message: string;
    message_type: MessageType;
    is_featured: boolean;
    bet_type?: BetType;
    bet_sub_type?: string;
    amount?: number;
    odds?: number;
    system_type?: SystemMessageType;
    system_data?: any;
    created_at: string;
    updated_at: string;
}

export interface SupabaseConnectedUser {
    id: string;
    match_id: number;
    user_id: string;
    username: string;
    connected_at: string;
    last_activity: string;
}

// Chat statistics types
export interface ChatStats {
    connectedUsers: number;
    activeRooms: number;
    totalMessages: number;
    featuredMessages: number;
}

// API response types
export interface ChatResponse {
    success: boolean;
    message?: string;
    data?: any;
    error?: string;
}

// Real-time event types
export interface ChatEvent {
    type: MessageType | 'user_joined' | 'user_left';
    matchId: number;
    data: ChatMessage | BetMessage | SystemMessage | ConnectedUser;
}

// Message filter types
export interface MessageFilter {
    matchId?: number;
    userId?: string;
    messageType?: MessageType;
    isFeatured?: boolean;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
}

// Pagination parameter types
export interface PaginationParams {
    page: number;
    limit: number;
    total: number;
}

// Paginated result types
export interface PaginatedResult<T> {
    data: T[];
    pagination: PaginationParams;
}

// Message metadata types
export interface MessageMetadata {
    isEdited: boolean;
    editHistory?: string[];
    reactions?: MessageReaction[];
    mentions?: string[];
}

// Message reaction types
export interface MessageReaction {
    userId: string;
    username: string;
    reaction: string; // emoji or text
    timestamp: number;
}

// Notification types
export interface ChatNotification {
    id: string;
    userId: string;
    type: 'mention' | 'reaction' | 'system';
    message: string;
    data?: any;
    isRead: boolean;
    createdAt: number;
}

// Chat settings types
export interface ChatSettings {
    maxMessageLength: number;
    allowEmojis: boolean;
    allowMentions: boolean;
    allowReactions: boolean;
    featuredThreshold: number; // Number of tokens to be "featured"
    rateLimit: number; // Messages per minute
}

// Chat log types
export interface ChatLog {
    id: string;
    matchId: number;
    userId: string;
    action: 'join' | 'leave' | 'send_message' | 'send_bet' | 'send_system';
    details?: any;
    timestamp: number;
    ipAddress?: string;
    userAgent?: string;
} 
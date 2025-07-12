export interface ChatMessage {
    id: string;
    matchId: number;
    userId: string;
    username: string;
    message: string;
    timestamp: number;
    type: 'message' | 'system' | 'bet';
}

export interface ChatRoom {
    matchId: number;
    messages: ChatMessage[];
    participants: string[];
    createdAt: number;
}

export interface BetMessage extends ChatMessage {
    type: 'bet';
    betType: 'home_win' | 'draw' | 'away_win';
    amount: number;
    odds: number;
}

export interface SystemMessage extends ChatMessage {
    type: 'system';
    systemType: 'match_start' | 'match_end' | 'goal' | 'user_joined' | 'user_left';
    data?: any;
} 
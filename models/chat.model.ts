export interface ChatMessage {
    id: string;
    matchId: number;
    userId: string;
    walletAddress: string;
    username: string;
    message: string;
    timestamp: number;
    type: 'message' | 'system' | 'bet';
    isFeatured: boolean;
}

export interface ChatRoom {
    matchId: number;
    messages: ChatMessage[];
    participants: string[];
    createdAt: number;
}

export interface BetMessage extends ChatMessage {
    type: 'bet';
    betType: 'match_winner' | 'over_under' | 'both_teams_score' | 'double_chance' | 'draw_no_bet' | 'first_half_winner' | 'first_half_goals' | 'ht_ft' | 'correct_score' | 'exact_goals_number' | 'goalscorers' | 'clean_sheet' | 'win_to_nil' | 'highest_scoring_half' | 'odd_even_goals' | 'first_half_odd_even';
    betSubType?: string; // Pour les sous-types comme "home", "over_2_5", etc.
    amount: number;
    odds: number;
}

export interface SystemMessage extends ChatMessage {
    type: 'system';
    systemType: 'match_start' | 'match_end' | 'goal' | 'user_joined' | 'user_left';
    data?: any;
} 
export interface ApiFootballMatch {
    fixture: {
        id: number;
        date: string;
        status: { short: string };
        venue: { name: string };
    };
    teams: {
        home: { name: string };
        away: { name: string };
    };
    goals: {
        home: number | null;
        away: number | null;
    };
    league: {
        name: string;
        season: number;
        id: number;
    };
    referee: string;
}

export interface ApiFootballOdds {
    fixture: {
        id: number;
    };
    update: string;
    bookmakers: Array<{
        id: number;
        name: string;
        bets: Array<{
            id: number;
            name: string;
            values: Array<{
                value: string;
                odd: string;
            }>;
        }>;
    }>;
}

// Extended odds types
export interface ExtendedOdds {
    // Match Winner (1X2)
    match_winner?: {
        home?: number;
        draw?: number;
        away?: number;
    };
    
    // Over/Under Goals
    over_under?: {
        [key: string]: number;
    };
    
    // Both Teams Score
    both_teams_score?: {
        yes?: number;
        no?: number;
    };
    
    // Double Chance
    double_chance?: {
        home_or_draw?: number;
        home_or_away?: number;
        draw_or_away?: number;
    };
    
    // Draw No Bet
    draw_no_bet?: {
        home?: number;
        away?: number;
    };
    
    // First Half Winner
    first_half_winner?: {
        home?: number;
        draw?: number;
        away?: number;
    };
    
    // First Half Goals
    first_half_goals?: {
        [key: string]: number;
    };
    
    // Half Time/Full Time
    ht_ft?: {
        [key: string]: number;
    };
    
    // Correct Score
    correct_score?: {
        [key: string]: number; // "1-0", "2-1", etc.
    };
    
    // Exact Goals Number
    exact_goals_number?: {
        [key: string]: number; // "0", "1", "2", etc.
    };
    
    // Goalscorers (First Goalscorer)
    goalscorers?: {
        [playerName: string]: number;
    };
    
    // Clean Sheet
    clean_sheet?: {
        [key: string]: number;
    };
    
    // Win to Nil
    win_to_nil?: {
        [key: string]: number;
    };
    
    // Highest Scoring Half
    highest_scoring_half?: {
        first_half?: number;
        second_half?: number;
        equal?: number;
    };
    
    // Odd/Even Goals
    odd_even_goals?: {
        odd?: number;
        even?: number;
    };
    
    // First Half Goals Odd/Even
    first_half_odd_even?: {
        odd?: number;
        even?: number;
    };
}
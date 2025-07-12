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

export interface MatchWithOdds {
    id: number;
    api_football_id: number;
    home_team: string;
    away_team: string;
    home_score: number | null;
    away_score: number | null;
    match_date: string;
    status: string;
    league: string;
    season: string;
    venue: string | null;
    referee: string | null;
    odds: {
        home_win: number;
        draw: number;
        away_win: number;
    };
}
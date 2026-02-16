import { ExtendedOdds, MatchWithOdds } from '../src/infrastructure/external/types/ApiFootball.types';

// Supabase Match interface (corresponds to database schema)
export interface SupabaseMatch {
    id: string; // UUID from database
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
    odds: ExtendedOdds | null;
    betting_contract_address?: string | null;
    created_at: string;
    updated_at: string;
}

// Match statistics
export interface MatchStats {
    total: number;
    live: number;
    upcoming: number;
    finished: number;
    leagues: number;
    timestamp: number;
}

// Match filter options
export interface MatchFilter {
    status?: string;
    league?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
}

// Match sync result
export interface MatchSyncResult {
    stored: number;
    cleaned: number;
}

// Match API response
export interface MatchApiResponse {
    success: boolean;
    matches?: MatchWithOdds[];
    match?: MatchWithOdds;
    stats?: MatchStats;
    count?: number;
    timestamp: number;
    error?: string;
}

// Match sync response
export interface MatchSyncResponse {
    success: boolean;
    message: string;
    stored: number;
    cleaned: number;
    timestamp: number;
} 
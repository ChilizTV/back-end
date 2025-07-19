import { supabase } from '../config/supabase';
import { ServiceResult } from './service.result';
import { ApiFootballMatch, ApiFootballOdds, ExtendedOdds } from '../models/ApiFootball.model';
import { MatchWithOdds, SupabaseMatch, MatchSyncResult } from '../models/supabase-match.model';

export class MatchService {
    private apiKey: string;
    private baseUrl: string;

    constructor() {
        this.apiKey = process.env.API_FOOTBALL_KEY || '';
        this.baseUrl = 'https://api-football-v1.p.rapidapi.com/v3';
        console.log('⚽ Match service initialized');
    }

    /**
     * Fetch matches from API Football for the last and next 24 hours
     */
    async fetchMatchesFromAPI(): Promise<ServiceResult<ApiFootballMatch[]>> {
        try {
            console.log('📡 Fetching matches from API Football...');
            
            const now = new Date();
            const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
            
            const fromDate = yesterday.toISOString().split('T')[0];
            const toDate = tomorrow.toISOString().split('T')[0];
            
            const url = `${this.baseUrl}/fixtures?date=${fromDate}&date=${toDate}`;
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'X-RapidAPI-Key': this.apiKey,
                    'X-RapidAPI-Host': 'api-football-v1.p.rapidapi.com'
                }
            });

            if (!response.ok) {
                throw new Error(`API Football error: ${response.status}`);
            }

            const data = await response.json();
            const matches = data.response || [];
            
            console.log(`✅ Fetched ${matches.length} matches from API Football`);
            return ServiceResult.success(matches);
        } catch (error) {
            console.error('❌ Error fetching matches from API:', error);
            return ServiceResult.failed();
        }
    }

    /**
     * Fetch odds for specific matches
     */
    async fetchOddsForMatches(matchIds: number[]): Promise<ServiceResult<ApiFootballOdds[]>> {
        try {
            console.log(`💰 Fetching odds for ${matchIds.length} matches...`);
            
            const oddsPromises = matchIds.map(async (matchId) => {
                const url = `${this.baseUrl}/odds?fixture=${matchId}`;
                
                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'X-RapidAPI-Key': this.apiKey,
                        'X-RapidAPI-Host': 'api-football-v1.p.rapidapi.com'
                    }
                });

                if (!response.ok) {
                    console.warn(`⚠️ Failed to fetch odds for match ${matchId}`);
                    return null;
                }

                const data = await response.json();
                return data.response?.[0] || null;
            });

            const oddsResults = await Promise.all(oddsPromises);
            const validOdds = oddsResults.filter(odds => odds !== null);
            
            console.log(`✅ Fetched odds for ${validOdds.length} matches`);
            return ServiceResult.success(validOdds);
        } catch (error) {
            console.error('❌ Error fetching odds:', error);
            return ServiceResult.failed();
        }
    }

    /**
     * Store matches in Supabase
     */
    async storeMatchesInSupabase(matches: ApiFootballMatch[], oddsData: ApiFootballOdds[]): Promise<ServiceResult<number>> {
        try {
            console.log(`💾 Storing ${matches.length} matches in Supabase...`);
            
            // Create a map of odds by fixture ID for quick lookup
            const oddsMap = new Map<number, ApiFootballOdds>();
            oddsData.forEach(odds => {
                if (odds.fixture?.id) {
                    oddsMap.set(odds.fixture.id, odds);
                }
            });

            const matchesToInsert = matches.map(match => {
                const odds = oddsMap.get(match.fixture.id);
                const extendedOdds = this.parseOdds(odds);
                
                return {
                    api_football_id: match.fixture.id,
                    home_team: match.teams.home.name,
                    away_team: match.teams.away.name,
                    home_score: match.goals.home,
                    away_score: match.goals.away,
                    match_date: match.fixture.date,
                    status: match.fixture.status.short,
                    league: match.league.name,
                    season: match.league.season.toString(),
                    venue: match.fixture.venue?.name || null,
                    referee: match.referee || null,
                    odds: extendedOdds
                };
            });

            // Use upsert to handle duplicates
            const { data, error } = await supabase
                .from('matches')
                .upsert(matchesToInsert, { 
                    onConflict: 'api_football_id',
                    ignoreDuplicates: false 
                })
                .select();

            if (error) {
                console.error('❌ Supabase error storing matches:', error);
                throw error;
            }

            console.log(`✅ Stored ${data?.length || 0} matches in Supabase`);
            return ServiceResult.success(data?.length || 0);
        } catch (error) {
            console.error('❌ Error storing matches in Supabase:', error);
            return ServiceResult.failed();
        }
    }

    /**
     * Get all matches from Supabase
     */
    async getMatchesFromSupabase(): Promise<ServiceResult<MatchWithOdds[]>> {
        try {
            console.log('📋 Getting matches from Supabase...');
            
            const { data, error } = await supabase
                .from('matches')
                .select('*')
                .order('match_date', { ascending: true });

            if (error) {
                console.error('❌ Supabase error getting matches:', error);
                throw error;
            }

            const matches = data.map((match: SupabaseMatch) => ({
                id: match.id,
                api_football_id: match.api_football_id,
                home_team: match.home_team,
                away_team: match.away_team,
                home_score: match.home_score,
                away_score: match.away_score,
                match_date: match.match_date,
                status: match.status,
                league: match.league,
                season: match.season,
                venue: match.venue,
                referee: match.referee,
                odds: match.odds
            }));

            console.log(`✅ Retrieved ${matches.length} matches from Supabase`);
            return ServiceResult.success(matches);
        } catch (error) {
            console.error('❌ Error getting matches from Supabase:', error);
            return ServiceResult.failed();
        }
    }

    /**
     * Clean up old matches and their related data
     */
    async cleanupOldMatches(): Promise<ServiceResult<number>> {
        try {
            console.log('🧹 Cleaning up old matches...');
            
            // Get matches older than 24 hours
            const { data: oldMatches, error: selectError } = await supabase
                .from('matches')
                .select('api_football_id')
                .lt('match_date', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

            if (selectError) {
                console.error('❌ Error selecting old matches:', selectError);
                throw selectError;
            }

            if (!oldMatches || oldMatches.length === 0) {
                console.log('✅ No old matches to clean up');
                return ServiceResult.success(0);
            }

            const matchIds = oldMatches.map(match => match.api_football_id);
            console.log(`🗑️ Cleaning up ${matchIds.length} old matches...`);

            // Delete related chat messages
            const { error: messagesError } = await supabase
                .from('chat_messages')
                .delete()
                .in('match_id', matchIds);

            if (messagesError) {
                console.error('❌ Error deleting chat messages:', messagesError);
            }

            // Delete related connected users
            const { error: usersError } = await supabase
                .from('chat_connected_users')
                .delete()
                .in('match_id', matchIds);

            if (usersError) {
                console.error('❌ Error deleting connected users:', usersError);
            }

            // Delete old matches
            const { error: matchesError } = await supabase
                .from('matches')
                .delete()
                .in('api_football_id', matchIds);

            if (matchesError) {
                console.error('❌ Error deleting old matches:', matchesError);
                throw matchesError;
            }

            console.log(`✅ Cleaned up ${matchIds.length} old matches and related data`);
            return ServiceResult.success(matchIds.length);
        } catch (error) {
            console.error('❌ Error cleaning up old matches:', error);
            return ServiceResult.failed();
        }
    }

    /**
     * Sync matches: fetch from API, store in Supabase, clean up old ones
     */
    async syncMatches(): Promise<ServiceResult<MatchSyncResult>> {
        try {
            console.log('🔄 Starting match synchronization...');
            
            // 1. Fetch matches from API
            const apiResult = await this.fetchMatchesFromAPI();
            if (apiResult.errorCode !== 0) {
                throw new Error('Failed to fetch matches from API');
            }

            const matches = apiResult.result as ApiFootballMatch[];
            if (matches.length === 0) {
                console.log('⚠️ No matches found from API');
                return ServiceResult.success({ stored: 0, cleaned: 0 });
            }

            // 2. Fetch odds for matches
            const matchIds = matches.map(match => match.fixture.id);
            const oddsResult = await this.fetchOddsForMatches(matchIds);
            const oddsData = oddsResult.errorCode === 0 ? (oddsResult.result as ApiFootballOdds[]) : [];

            // 3. Store matches in Supabase
            const storeResult = await this.storeMatchesInSupabase(matches, oddsData);
            if (storeResult.errorCode !== 0) {
                throw new Error('Failed to store matches in Supabase');
            }

            // 4. Clean up old matches
            const cleanupResult = await this.cleanupOldMatches();
            const cleanedCount = cleanupResult.errorCode === 0 ? (cleanupResult.result as number) : 0;

            console.log(`✅ Match sync completed: ${storeResult.result} stored, ${cleanedCount} cleaned`);
            return ServiceResult.success({ 
                stored: storeResult.result as number, 
                cleaned: cleanedCount 
            });
        } catch (error) {
            console.error('❌ Error syncing matches:', error);
            return ServiceResult.failed();
        }
    }

    /**
     * Parse odds data from API Football format to our extended format
     */
    private parseOdds(oddsData?: ApiFootballOdds): ExtendedOdds | null {
        if (!oddsData || !oddsData.bookmakers) {
            return null;
        }

        const extendedOdds: ExtendedOdds = {};

        oddsData.bookmakers.forEach(bookmaker => {
            bookmaker.bets.forEach(bet => {
                switch (bet.name) {
                    case 'Match Winner':
                        extendedOdds.match_winner = {};
                        bet.values.forEach(value => {
                            if (value.value === 'Home') extendedOdds.match_winner!.home = parseFloat(value.odd);
                            else if (value.value === 'Draw') extendedOdds.match_winner!.draw = parseFloat(value.odd);
                            else if (value.value === 'Away') extendedOdds.match_winner!.away = parseFloat(value.odd);
                        });
                        break;
                    case 'Over/Under':
                        extendedOdds.over_under = {};
                        bet.values.forEach(value => {
                            extendedOdds.over_under![value.value.toLowerCase().replace(' ', '_')] = parseFloat(value.odd);
                        });
                        break;
                    case 'Both teams score':
                        extendedOdds.both_teams_score = {};
                        bet.values.forEach(value => {
                            if (value.value === 'Yes') extendedOdds.both_teams_score!.yes = parseFloat(value.odd);
                            else if (value.value === 'No') extendedOdds.both_teams_score!.no = parseFloat(value.odd);
                        });
                        break;
                    // Add more bet types as needed
                }
            });
        });

        return extendedOdds;
    }
} 
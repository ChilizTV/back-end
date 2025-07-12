import { ServiceResult } from './service.result';
import axios from 'axios';
import { ApiFootballMatch, ApiFootballOdds, MatchWithOdds } from '../models';
import { config } from 'dotenv';

config();

export class MatchService {
    private readonly API_FOOTBALL_BASE_URL = 'https://v3.football.api-sports.io';
    private readonly API_FOOTBALL_KEY = process.env.API_FOOTBALL_KEY;
    
    private matchesCache: MatchWithOdds[] = [];
    private lastFetchTime: Date | null = null;
    private isFetching: boolean = false;

    private readonly ALLOWED_LEAGUE_IDS = [
        743, 15, 39, 61, 140, 2, 3, 78, 135
    ];

    private getNext24Hours(): Date {
        const now = new Date();
        const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        return next24Hours;
    }

    private getPast24Hours(): Date {
        const now = new Date();
        const past24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        return past24Hours;
    }

    private generateRandomOdds(): { home_win: number; draw: number; away_win: number } {
        const homeWin = Math.random() * 2 + 1;
        const draw = Math.random() * 3 + 2;
        const awayWin = Math.random() * 2 + 1;
        
        return {
            home_win: Math.round(homeWin * 100) / 100,
            draw: Math.round(draw * 100) / 100,
            away_win: Math.round(awayWin * 100) / 100
        };
    }

    private async getMatchOdds(fixtureId: number): Promise<{ home_win: number; draw: number; away_win: number }> {
        try {
            const response = await axios.get(`${this.API_FOOTBALL_BASE_URL}/odds`, {
                headers: {
                    'x-rapidapi-key': this.API_FOOTBALL_KEY,
                    'x-rapidapi-host': 'v3.football.api-sports.io'
                },
                params: {
                    fixture: fixtureId,
                    bookmaker: 1
                }
            });

            const oddsData: ApiFootballOdds[] = response.data.response || [];
            
            if (oddsData.length > 0 && oddsData[0].bookmakers.length > 0) {
                const bookmaker = oddsData[0].bookmakers[0];
                const matchWinnerBet = bookmaker.bets.find(bet => bet.name === 'Match Winner');
                
                if (matchWinnerBet) {
                    const homeWin = matchWinnerBet.values.find(v => v.value === 'Home')?.odd;
                    const draw = matchWinnerBet.values.find(v => v.value === 'Draw')?.odd;
                    const awayWin = matchWinnerBet.values.find(v => v.value === 'Away')?.odd;
                    
                    if (homeWin && draw && awayWin) {
                        const odds = {
                            home_win: parseFloat(homeWin),
                            draw: parseFloat(draw),
                            away_win: parseFloat(awayWin)
                        };
                        
                        console.log(`💰 Real odds for fixture ${fixtureId}: Home ${odds.home_win} | Draw ${odds.draw} | Away ${odds.away_win}`);
                        return odds;
                    }
                }
            }
            
            console.log(`⚠️ No odds found for fixture ${fixtureId}, using random odds`);
            const randomOdds = this.generateRandomOdds();
            console.log(`🎲 Random odds for fixture ${fixtureId}: Home ${randomOdds.home_win} | Draw ${randomOdds.draw} | Away ${randomOdds.away_win}`);
            return randomOdds;
        } catch (error) {
            console.log(`⚠️ Error fetching odds for fixture ${fixtureId}, using random odds`);
            const randomOdds = this.generateRandomOdds();
            console.log(`🎲 Random odds for fixture ${fixtureId}: Home ${randomOdds.home_win} | Draw ${randomOdds.draw} | Away ${randomOdds.away_win}`);
            return randomOdds;
        }
    }

    private mapApiStatusToStatus(apiStatus: string): string {
        switch (apiStatus) {
            case 'NS':
                return 'scheduled';
            case '1H':
            case '2H':
            case 'HT':
            case 'ET':
            case 'P':
            case 'BT':
                return 'live';
            case 'FT':
            case 'AET':
            case 'PEN':
                return 'finished';
            case 'CANC':
            case 'ABD':
            case 'AWD':
            case 'WO':
                return 'cancelled';
            default:
                return 'scheduled';
        }
    }

    private isLeagueAllowed(leagueId: number): boolean {
        return this.ALLOWED_LEAGUE_IDS.includes(leagueId);
    }

    private async transformApiMatchToMatchWithOdds(apiMatch: ApiFootballMatch): Promise<MatchWithOdds> {
        console.log(`Transforming match: ${apiMatch.teams.home.name} vs ${apiMatch.teams.away.name} (${apiMatch.league.name} - ID: ${apiMatch.league.id})`);
        
        const odds = await this.getMatchOdds(apiMatch.fixture.id);
        
        return {
            id: apiMatch.fixture.id,
            api_football_id: apiMatch.fixture.id,
            home_team: apiMatch.teams.home.name,
            away_team: apiMatch.teams.away.name,
            home_score: apiMatch.goals.home,
            away_score: apiMatch.goals.away,
            match_date: apiMatch.fixture.date,
            status: this.mapApiStatusToStatus(apiMatch.fixture.status.short),
            league: apiMatch.league.name,
            season: apiMatch.league.season.toString(),
            venue: apiMatch.fixture.venue?.name || null,
            referee: apiMatch.referee || null,
            odds: odds
        };
    }

    async refetchMatchesFromApi(): Promise<ServiceResult<void>> {
        if (this.isFetching) {
            console.log('Already fetching matches, skipping...');
            return ServiceResult.success(undefined);
        }

        this.isFetching = true;
        
        try {
            console.log('🔄 Starting match refetch from API-FOOTBALL...');
            
            if (!this.API_FOOTBALL_KEY) {
                console.error('❌ API_FOOTBALL_KEY not configured');
                this.isFetching = false;
                return ServiceResult.failed();
            }

            const next24Hours = this.getNext24Hours();
            const now = new Date();
            
            const formatDate = (date: Date): string => {
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            };

            const today = formatDate(now);
            const tomorrow = formatDate(new Date(now.getTime() + 24 * 60 * 60 * 1000));
            const yesterday = formatDate(new Date(now.getTime() - 24 * 60 * 60 * 1000));
            
            console.log(`📅 Fetching matches for yesterday (${yesterday}), today (${today}) and tomorrow (${tomorrow})`);
            console.log(`🏆 Filtering for allowed leagues: ${this.ALLOWED_LEAGUE_IDS.join(', ')}`);

            const allMatches: ApiFootballMatch[] = [];
            
            console.log(`📊 Fetching matches for ${yesterday}...`);
            const yesterdayResponse = await axios.get(`${this.API_FOOTBALL_BASE_URL}/fixtures`, {
                headers: {
                    'x-rapidapi-key': this.API_FOOTBALL_KEY,
                    'x-rapidapi-host': 'v3.football.api-sports.io'
                },
                params: {
                    date: yesterday,
                    status: 'NS-LIVE-FT'
                }
            });

            console.log(`📊 Yesterday's matches: ${yesterdayResponse.data.response?.length || 0} matches found`);
            if (yesterdayResponse.data.response) {
                allMatches.push(...yesterdayResponse.data.response);
            }
            
            console.log(`📊 Fetching matches for ${today}...`);
            const todayResponse = await axios.get(`${this.API_FOOTBALL_BASE_URL}/fixtures`, {
                headers: {
                    'x-rapidapi-key': this.API_FOOTBALL_KEY,
                    'x-rapidapi-host': 'v3.football.api-sports.io'
                },
                params: {
                    date: today,
                    status: 'NS-LIVE-FT'
                }
            });

            console.log(`📊 Today's matches: ${todayResponse.data.response?.length || 0} matches found`);
            if (todayResponse.data.response) {
                allMatches.push(...todayResponse.data.response);
            }

            console.log(`📊 Fetching matches for ${tomorrow}...`);
            const tomorrowResponse = await axios.get(`${this.API_FOOTBALL_BASE_URL}/fixtures`, {
                headers: {
                    'x-rapidapi-key': this.API_FOOTBALL_KEY,
                    'x-rapidapi-host': 'v3.football.api-sports.io'
                },
                params: {
                    date: tomorrow,
                    status: 'NS-LIVE-FT'
                }
            });

            console.log(`📊 Tomorrow's matches: ${tomorrowResponse.data.response?.length || 0} matches found`);
            if (tomorrowResponse.data.response) {
                allMatches.push(...tomorrowResponse.data.response);
            }

            console.log(`📊 Total matches found: ${allMatches.length}`);
            
            const filteredMatches = allMatches.filter(apiMatch => {
                const matchDate = new Date(apiMatch.fixture.date);
                const now = new Date();
                const past24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
                
                const isInTimeRange = matchDate <= next24Hours && matchDate >= past24Hours;
                const isAllowedLeague = this.isLeagueAllowed(apiMatch.league.id);
                
                return isInTimeRange && isAllowedLeague;
            });

            console.log(`🏆 Matches after league filtering: ${filteredMatches.length} matches`);
            
            console.log('🔍 API-FOOTBALL JSON Response (Filtered matches only):');
            console.log(JSON.stringify({
                get: "fixtures",
                parameters: {
                    date: `${yesterday}-${tomorrow}`,
                    status: "NS-LIVE-FT",
                    allowed_leagues: this.ALLOWED_LEAGUE_IDS
                },
                results: filteredMatches.length,
                response: filteredMatches
            }, null, 2));

            const matchesIn24h = await Promise.all(filteredMatches
                .map(apiMatch => this.transformApiMatchToMatchWithOdds(apiMatch)));

            const sortedMatches = matchesIn24h.sort((a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime());

            this.matchesCache = sortedMatches;
            this.lastFetchTime = new Date();

            console.log(`✅ Cache updated: ${matchesIn24h.length} matches stored in memory`);
            console.log(`⏰ Last fetch time: ${this.lastFetchTime.toISOString()}`);

            return ServiceResult.success(undefined);
        } catch (error) {
            console.error('❌ Error refetching matches from API:', error);
            this.isFetching = false;
            return ServiceResult.failed();
        } finally {
            this.isFetching = false;
        }
    }

    private getMatchesFromCache(): MatchWithOdds[] {
        if (!this.lastFetchTime) {
            console.log('⚠️ No matches in cache, returning empty array');
            return [];
        }

        const cacheAge = Date.now() - this.lastFetchTime.getTime();
        const cacheAgeMinutes = cacheAge / (1000 * 60);
        
        console.log(`📦 Cache age: ${cacheAgeMinutes.toFixed(2)} minutes`);
        console.log(`📊 Returning ${this.matchesCache.length} matches from cache`);

        return [...this.matchesCache];
    }

    private async ensureFreshData(): Promise<void> {
        const cacheAgeThreshold = 15 * 60 * 1000;
        
        if (!this.lastFetchTime || 
            Date.now() - this.lastFetchTime.getTime() > cacheAgeThreshold || 
            this.matchesCache.length === 0) {
            console.log('🔄 Cache is stale or empty, refetching data...');
            await this.refetchMatchesFromApi();
        }
    }

    async getAllMatches(): Promise<ServiceResult<MatchWithOdds[]>> {
        try {
            console.log('📋 GET /matches - Fetching all matches from cache');
            await this.ensureFreshData();
            const matches = this.getMatchesFromCache();
            console.log(`✅ Returning ${matches.length} matches from cache`);
            return ServiceResult.success(matches);
        } catch (error) {
            console.error('❌ Error in getAllMatches:', error);
            return ServiceResult.failed();
        }
    }

    async getLiveMatches(): Promise<ServiceResult<MatchWithOdds[]>> {
        try {
            console.log('📺 GET /matches/live - Fetching live matches from cache');
            await this.ensureFreshData();
            const allMatches = this.getMatchesFromCache();
            const liveMatches = allMatches.filter(match => match.status === 'live');
            console.log(`✅ Returning ${liveMatches.length} live matches from cache`);
            return ServiceResult.success(liveMatches);
        } catch (error) {
            console.error('❌ Error in getLiveMatches:', error);
            return ServiceResult.failed();
        }
    }

    async getUpcomingMatches(): Promise<ServiceResult<MatchWithOdds[]>> {
        try {
            console.log('⏰ GET /matches/upcoming - Fetching upcoming matches from cache');
            await this.ensureFreshData();
            const allMatches = this.getMatchesFromCache();
            const upcomingMatches = allMatches.filter(match => match.status === 'scheduled');
            console.log(`✅ Returning ${upcomingMatches.length} upcoming matches from cache`);
            return ServiceResult.success(upcomingMatches);
        } catch (error) {
            console.error('❌ Error in getUpcomingMatches:', error);
            return ServiceResult.failed();
        }
    }

    async getMatchesByLeague(league: string): Promise<ServiceResult<MatchWithOdds[]>> {
        try {
            console.log(`🏆 GET /matches/league/${league} - Fetching matches by league from cache`);
            await this.ensureFreshData();
            const allMatches = this.getMatchesFromCache();
            const leagueMatches = allMatches.filter(match => 
                match.league.toLowerCase().includes(league.toLowerCase())
            );
            console.log(`✅ Returning ${leagueMatches.length} matches for league ${league} from cache`);
            return ServiceResult.success(leagueMatches);
        } catch (error) {
            console.error('❌ Error in getMatchesByLeague:', error);
            return ServiceResult.failed();
        }
    }

    async getMatchById(id: number): Promise<ServiceResult<MatchWithOdds>> {
        try {
            console.log(`🔍 GET /matches/${id} - Fetching match by ID from cache`);
            await this.ensureFreshData();
            const allMatches = this.getMatchesFromCache();
            const match = allMatches.find(m => m.id === id);
            
            if (!match) {
                console.log(`❌ Match ${id} not found in cache`);
                return ServiceResult.notFound();
            }

            console.log(`✅ Match ${id} found in cache`);
            return ServiceResult.success(match);
        } catch (error) {
            console.error('❌ Error in getMatchById:', error);
            return ServiceResult.failed();
        }
    }

    async getMatchesInNext24Hours(): Promise<ServiceResult<MatchWithOdds[]>> {
        console.log('⏰ GET /matches/next-24h - Fetching matches in next 24 hours from cache');
        return this.getAllMatches();
    }

    async syncMatchesFromApi(): Promise<ServiceResult<void>> {
        console.log('🔄 POST /matches/sync - Manual sync triggered');
        return this.refetchMatchesFromApi();
    }

    async getMatchesByDateRange(startDate: Date, endDate: Date): Promise<ServiceResult<MatchWithOdds[]>> {
        try {
            console.log(`📅 GET /matches/date-range - Fetching matches by date range from cache`);
            await this.ensureFreshData();
            const allMatches = this.getMatchesFromCache();
            
            const matchesInRange = allMatches.filter(match => {
                const matchDate = new Date(match.match_date);
                return matchDate >= startDate && matchDate <= endDate;
            });

            console.log(`✅ Returning ${matchesInRange.length} matches for date range from cache`);
            return ServiceResult.success(matchesInRange);
        } catch (error) {
            console.error('❌ Error in getMatchesByDateRange:', error);
            return ServiceResult.failed();
        }
    }

    getCacheStats(): { 
        matchesCount: number; 
        lastFetchTime: Date | null; 
        cacheAgeMinutes: number | null;
        isFetching: boolean;
    } {
        const cacheAgeMinutes = this.lastFetchTime 
            ? (Date.now() - this.lastFetchTime.getTime()) / (1000 * 60)
            : null;

        return {
            matchesCount: this.matchesCache.length,
            lastFetchTime: this.lastFetchTime,
            cacheAgeMinutes,
            isFetching: this.isFetching
        };
    }
} 
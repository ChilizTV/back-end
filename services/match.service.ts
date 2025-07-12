import { ServiceResult } from './service.result';
import axios from 'axios';
import { ApiFootballMatch, ApiFootballOdds, MatchWithOdds, ExtendedOdds } from '../models';
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

    private async getMatchOdds(fixtureId: number): Promise<ExtendedOdds> {
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
                const extendedOdds: ExtendedOdds = {};
                
                // Match Winner (1X2)
                const matchWinnerBet = bookmaker.bets.find(bet => bet.name === 'Match Winner');
                if (matchWinnerBet) {
                    const homeWin = matchWinnerBet.values.find(v => v.value === 'Home')?.odd;
                    const draw = matchWinnerBet.values.find(v => v.value === 'Draw')?.odd;
                    const awayWin = matchWinnerBet.values.find(v => v.value === 'Away')?.odd;
                    
                    if (homeWin && draw && awayWin) {
                        extendedOdds.match_winner = {
                            home: parseFloat(homeWin),
                            draw: parseFloat(draw),
                            away: parseFloat(awayWin)
                        };
                        console.log(`💰 Match Winner odds for fixture ${fixtureId}: Home ${extendedOdds.match_winner.home} | Draw ${extendedOdds.match_winner.draw} | Away ${extendedOdds.match_winner.away}`);
                    }
                }
                
                // Over/Under Goals
                const overUnderBet = bookmaker.bets.find(bet => bet.name === 'Over/Under');
                if (overUnderBet) {
                    const overUnder: any = {};
                    overUnderBet.values.forEach(value => {
                        if (value.value.includes('Over')) {
                            overUnder[`over_${value.value.replace('Over ', '').replace('.', '_')}`] = parseFloat(value.odd);
                        } else if (value.value.includes('Under')) {
                            overUnder[`under_${value.value.replace('Under ', '').replace('.', '_')}`] = parseFloat(value.odd);
                        }
                    });
                    if (Object.keys(overUnder).length > 0) {
                        extendedOdds.over_under = overUnder;
                        console.log(`💰 Over/Under odds for fixture ${fixtureId}: ${Object.keys(overUnder).length} options`);
                    }
                }
                
                // Both Teams Score
                const bothTeamsScoreBet = bookmaker.bets.find(bet => bet.name === 'Both Teams Score');
                if (bothTeamsScoreBet) {
                    const yes = bothTeamsScoreBet.values.find(v => v.value === 'Yes')?.odd;
                    const no = bothTeamsScoreBet.values.find(v => v.value === 'No')?.odd;
                    
                    if (yes && no) {
                        extendedOdds.both_teams_score = {
                            yes: parseFloat(yes),
                            no: parseFloat(no)
                        };
                        console.log(`💰 Both Teams Score odds for fixture ${fixtureId}: Yes ${extendedOdds.both_teams_score.yes} | No ${extendedOdds.both_teams_score.no}`);
                    }
                }
                
                // Double Chance
                const doubleChanceBet = bookmaker.bets.find(bet => bet.name === 'Double Chance');
                if (doubleChanceBet) {
                    const homeOrDraw = doubleChanceBet.values.find(v => v.value === 'Home/Draw')?.odd;
                    const homeOrAway = doubleChanceBet.values.find(v => v.value === 'Home/Away')?.odd;
                    const drawOrAway = doubleChanceBet.values.find(v => v.value === 'Draw/Away')?.odd;
                    
                    if (homeOrDraw && homeOrAway && drawOrAway) {
                        extendedOdds.double_chance = {
                            home_or_draw: parseFloat(homeOrDraw),
                            home_or_away: parseFloat(homeOrAway),
                            draw_or_away: parseFloat(drawOrAway)
                        };
                        console.log(`💰 Double Chance odds for fixture ${fixtureId}: Home/Draw ${extendedOdds.double_chance.home_or_draw} | Home/Away ${extendedOdds.double_chance.home_or_away} | Draw/Away ${extendedOdds.double_chance.draw_or_away}`);
                    }
                }
                
                // Draw No Bet
                const drawNoBetBet = bookmaker.bets.find(bet => bet.name === 'Draw No Bet');
                if (drawNoBetBet) {
                    const home = drawNoBetBet.values.find(v => v.value === 'Home')?.odd;
                    const away = drawNoBetBet.values.find(v => v.value === 'Away')?.odd;
                    
                    if (home && away) {
                        extendedOdds.draw_no_bet = {
                            home: parseFloat(home),
                            away: parseFloat(away)
                        };
                        console.log(`💰 Draw No Bet odds for fixture ${fixtureId}: Home ${extendedOdds.draw_no_bet.home} | Away ${extendedOdds.draw_no_bet.away}`);
                    }
                }
                
                // First Half Winner
                const firstHalfWinnerBet = bookmaker.bets.find(bet => bet.name === '1st Half Winner');
                if (firstHalfWinnerBet) {
                    const home = firstHalfWinnerBet.values.find(v => v.value === 'Home')?.odd;
                    const draw = firstHalfWinnerBet.values.find(v => v.value === 'Draw')?.odd;
                    const away = firstHalfWinnerBet.values.find(v => v.value === 'Away')?.odd;
                    
                    if (home && draw && away) {
                        extendedOdds.first_half_winner = {
                            home: parseFloat(home),
                            draw: parseFloat(draw),
                            away: parseFloat(away)
                        };
                        console.log(`💰 First Half Winner odds for fixture ${fixtureId}: Home ${extendedOdds.first_half_winner.home} | Draw ${extendedOdds.first_half_winner.draw} | Away ${extendedOdds.first_half_winner.away}`);
                    }
                }
                
                // First Half Goals
                const firstHalfGoalsBet = bookmaker.bets.find(bet => bet.name === '1st Half Goals');
                if (firstHalfGoalsBet) {
                    const over05 = firstHalfGoalsBet.values.find(v => v.value === 'Over 0.5')?.odd;
                    const over15 = firstHalfGoalsBet.values.find(v => v.value === 'Over 1.5')?.odd;
                    const under05 = firstHalfGoalsBet.values.find(v => v.value === 'Under 0.5')?.odd;
                    const under15 = firstHalfGoalsBet.values.find(v => v.value === 'Under 1.5')?.odd;
                    
                    if (over05 || over15 || under05 || under15) {
                        extendedOdds.first_half_goals = {
                            over_0_5: over05 ? parseFloat(over05) : 0,
                            over_1_5: over15 ? parseFloat(over15) : 0,
                            under_0_5: under05 ? parseFloat(under05) : 0,
                            under_1_5: under15 ? parseFloat(under15) : 0
                        };
                        console.log(`💰 First Half Goals odds for fixture ${fixtureId}: ${Object.keys(extendedOdds.first_half_goals).length} options`);
                    }
                }
                
                // HT/FT (Half Time/Full Time)
                const htFtBet = bookmaker.bets.find(bet => bet.name === 'HT/FT');
                if (htFtBet) {
                    const htFt: any = {};
                    htFtBet.values.forEach(value => {
                        const key = value.value.toLowerCase().replace(' ', '_');
                        htFt[key] = parseFloat(value.odd);
                    });
                    if (Object.keys(htFt).length > 0) {
                        extendedOdds.ht_ft = htFt;
                        console.log(`💰 HT/FT odds for fixture ${fixtureId}: ${Object.keys(htFt).length} options`);
                    }
                }
                
                // Correct Score
                const correctScoreBet = bookmaker.bets.find(bet => bet.name === 'Correct Score');
                if (correctScoreBet) {
                    const correctScore: any = {};
                    correctScoreBet.values.forEach(value => {
                        correctScore[value.value] = parseFloat(value.odd);
                    });
                    if (Object.keys(correctScore).length > 0) {
                        extendedOdds.correct_score = correctScore;
                        console.log(`💰 Correct Score odds for fixture ${fixtureId}: ${Object.keys(correctScore).length} options`);
                    }
                }
                
                // Exact Goals Number
                const exactGoalsBet = bookmaker.bets.find(bet => bet.name === 'Exact Goals Number');
                if (exactGoalsBet) {
                    const exactGoals: any = {};
                    exactGoalsBet.values.forEach(value => {
                        exactGoals[value.value] = parseFloat(value.odd);
                    });
                    if (Object.keys(exactGoals).length > 0) {
                        extendedOdds.exact_goals_number = exactGoals;
                        console.log(`💰 Exact Goals Number odds for fixture ${fixtureId}: ${Object.keys(exactGoals).length} options`);
                    }
                }
                
                // Goalscorers (First Goalscorer)
                const goalscorersBet = bookmaker.bets.find(bet => bet.name === 'Goalscorers');
                if (goalscorersBet) {
                    const goalscorers: any = {};
                    goalscorersBet.values.forEach(value => {
                        goalscorers[value.value] = parseFloat(value.odd);
                    });
                    if (Object.keys(goalscorers).length > 0) {
                        extendedOdds.goalscorers = goalscorers;
                        console.log(`💰 Goalscorers odds for fixture ${fixtureId}: ${Object.keys(goalscorers).length} players`);
                    }
                }
                
                // Clean Sheet
                const cleanSheetBet = bookmaker.bets.find(bet => bet.name === 'Clean Sheet');
                if (cleanSheetBet) {
                    const cleanSheet: any = {};
                    cleanSheetBet.values.forEach(value => {
                        if (value.value.includes('Home')) {
                            cleanSheet[`home_${value.value.includes('Yes') ? 'yes' : 'no'}`] = parseFloat(value.odd);
                        } else if (value.value.includes('Away')) {
                            cleanSheet[`away_${value.value.includes('Yes') ? 'yes' : 'no'}`] = parseFloat(value.odd);
                        }
                    });
                    if (Object.keys(cleanSheet).length > 0) {
                        extendedOdds.clean_sheet = cleanSheet;
                        console.log(`💰 Clean Sheet odds for fixture ${fixtureId}: ${Object.keys(cleanSheet).length} options`);
                    }
                }
                
                // Win to Nil
                const winToNilBet = bookmaker.bets.find(bet => bet.name === 'Win to Nil');
                if (winToNilBet) {
                    const winToNil: any = {};
                    winToNilBet.values.forEach(value => {
                        if (value.value.includes('Home')) {
                            winToNil[`home_${value.value.includes('Yes') ? 'yes' : 'no'}`] = parseFloat(value.odd);
                        } else if (value.value.includes('Away')) {
                            winToNil[`away_${value.value.includes('Yes') ? 'yes' : 'no'}`] = parseFloat(value.odd);
                        }
                    });
                    if (Object.keys(winToNil).length > 0) {
                        extendedOdds.win_to_nil = winToNil;
                        console.log(`💰 Win to Nil odds for fixture ${fixtureId}: ${Object.keys(winToNil).length} options`);
                    }
                }
                
                // Highest Scoring Half
                const highestScoringHalfBet = bookmaker.bets.find(bet => bet.name === 'Highest Scoring Half');
                if (highestScoringHalfBet) {
                    const firstHalf = highestScoringHalfBet.values.find(v => v.value === '1st Half')?.odd;
                    const secondHalf = highestScoringHalfBet.values.find(v => v.value === '2nd Half')?.odd;
                    const equal = highestScoringHalfBet.values.find(v => v.value === 'Equal')?.odd;
                    
                    if (firstHalf || secondHalf || equal) {
                        extendedOdds.highest_scoring_half = {
                            first_half: firstHalf ? parseFloat(firstHalf) : 0,
                            second_half: secondHalf ? parseFloat(secondHalf) : 0,
                            equal: equal ? parseFloat(equal) : 0
                        };
                        console.log(`💰 Highest Scoring Half odds for fixture ${fixtureId}: 1st ${extendedOdds.highest_scoring_half.first_half} | 2nd ${extendedOdds.highest_scoring_half.second_half} | Equal ${extendedOdds.highest_scoring_half.equal}`);
                    }
                }
                
                // Odd/Even Goals
                const oddEvenBet = bookmaker.bets.find(bet => bet.name === 'Odd/Even Goals');
                if (oddEvenBet) {
                    const odd = oddEvenBet.values.find(v => v.value === 'Odd')?.odd;
                    const even = oddEvenBet.values.find(v => v.value === 'Even')?.odd;
                    
                    if (odd && even) {
                        extendedOdds.odd_even_goals = {
                            odd: parseFloat(odd),
                            even: parseFloat(even)
                        };
                        console.log(`💰 Odd/Even Goals odds for fixture ${fixtureId}: Odd ${extendedOdds.odd_even_goals.odd} | Even ${extendedOdds.odd_even_goals.even}`);
                    }
                }
                
                // First Half Goals Odd/Even
                const firstHalfOddEvenBet = bookmaker.bets.find(bet => bet.name === '1st Half Goals Odd/Even');
                if (firstHalfOddEvenBet) {
                    const odd = firstHalfOddEvenBet.values.find(v => v.value === 'Odd')?.odd;
                    const even = firstHalfOddEvenBet.values.find(v => v.value === 'Even')?.odd;
                    
                    if (odd && even) {
                        extendedOdds.first_half_odd_even = {
                            odd: parseFloat(odd),
                            even: parseFloat(even)
                        };
                        console.log(`💰 First Half Goals Odd/Even odds for fixture ${fixtureId}: Odd ${extendedOdds.first_half_odd_even.odd} | Even ${extendedOdds.first_half_odd_even.even}`);
                    }
                }
                
                if (Object.keys(extendedOdds).length > 0) {
                    console.log(`✅ Found ${Object.keys(extendedOdds).length} types of odds for fixture ${fixtureId}`);
                    return extendedOdds;
                }
            }
            
            console.log(`⚠️ No odds found for fixture ${fixtureId}, using random odds`);
            const randomOdds = this.generateRandomOdds();
            return {
                match_winner: {
                    home: randomOdds.home_win,
                    draw: randomOdds.draw,
                    away: randomOdds.away_win
                }
            };
        } catch (error) {
            console.log(`⚠️ Error fetching odds for fixture ${fixtureId}, using random odds`);
            const randomOdds = this.generateRandomOdds();
            return {
                match_winner: {
                    home: randomOdds.home_win,
                    draw: randomOdds.draw,
                    away: randomOdds.away_win
                }
            };
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
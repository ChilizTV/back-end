import { supabase } from '../config/supabase';
import { ServiceResult } from './service.result';
import { ApiFootballMatch, ApiFootballOdds, ExtendedOdds, MatchWithOdds } from '../models/ApiFootball.model';
import { SupabaseMatch, MatchSyncResult } from '../models/supabase-match.model';
import axios from 'axios';
import { config } from 'dotenv';
import { bettingDeploymentService } from './betting-match-deployment.service';

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

    constructor() {
        console.log('⚽ Match service initialized');
    }

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
            id: apiMatch.fixture.id.toString(),
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

    /**
     * Fetch matches from API Football for the last and next 24 hours
     */
    async fetchMatchesFromAPI(): Promise<ServiceResult<ApiFootballMatch[]>> {
        if (this.isFetching) {
            console.log('Already fetching matches, skipping...');
            return ServiceResult.success([]);
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

            console.log(`✅ Fetched ${filteredMatches.length} matches from API Football`);
            return ServiceResult.success(filteredMatches);
        } catch (error) {
            console.error('❌ Error fetching matches from API:', error);
            this.isFetching = false;
            return ServiceResult.failed();
        } finally {
            this.isFetching = false;
        }
    }

    /**
     * Fetch odds for specific matches
     */
    async fetchOddsForMatches(matchIds: number[]): Promise<ServiceResult<ApiFootballOdds[]>> {
        try {
            console.log(`💰 Fetching odds for ${matchIds.length} matches...`);
            
            const oddsPromises = matchIds.map(async (matchId) => {
                try {
                    const response = await axios.get(`${this.API_FOOTBALL_BASE_URL}/odds`, {
                        headers: {
                            'x-rapidapi-key': this.API_FOOTBALL_KEY,
                            'x-rapidapi-host': 'v3.football.api-sports.io'
                        },
                        params: {
                            fixture: matchId,
                            bookmaker: 1
                        }
                    });

                    if (response.data.response && response.data.response.length > 0) {
                        return response.data.response[0];
                    }
                    return null;
                } catch (error) {
                    console.warn(`⚠️ Failed to fetch odds for match ${matchId}`);
                    return null;
                }
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
     * Store matches in Supabase and deploy betting contracts for new matches
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

            // Check which matches already exist to avoid deploying contracts for existing ones
            const { data: existingMatches } = await supabase
                .from('matches')
                .select('api_football_id, betting_contract_address')
                .in('api_football_id', matches.map(m => m.fixture.id));

            const existingMatchIds = new Set(existingMatches?.map(m => m.api_football_id) || []);

            const matchesToInsert = await Promise.all(matches.map(async match => {
                const odds = oddsMap.get(match.fixture.id);
                const extendedOdds = odds ? this.parseOdds(odds) : null;
                const isNewMatch = !existingMatchIds.has(match.fixture.id);
                
                let bettingContractAddress: string | null = null;
                
                // Deploy betting contract only for new matches
                if (isNewMatch) {
                    try {
                        console.log(`🎲 Deploying betting contract for new match: ${match.teams.home.name} vs ${match.teams.away.name}`);
                        const matchName = `${match.teams.home.name} vs ${match.teams.away.name}`;
                        const ownerAddress = bettingDeploymentService.getAdminAddress();
                        
                        bettingContractAddress = await bettingDeploymentService.deployFootballMatch(
                            matchName,
                            ownerAddress
                        );
                        
                        console.log(`✅ Betting contract deployed at: ${bettingContractAddress}`);
                    } catch (error) {
                        console.error(`❌ Failed to deploy betting contract for match ${match.fixture.id}:`, error);
                        // Continue without contract address - can be deployed later manually
                    }
                }
                
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
                    odds: extendedOdds,
                    betting_contract_address: bettingContractAddress
                };
            }));

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
                odds: match.odds,
                betting_contract_address: match.betting_contract_address ?? null
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

            const matchIds = oldMatches.map((match: { api_football_id: number }) => match.api_football_id);
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
                        extendedOdds.match_winner = {
                            home: 0,
                            draw: 0,
                            away: 0
                        };
                        bet.values.forEach(value => {
                            if (value.value === 'Home') extendedOdds.match_winner!.home = parseFloat(value.odd);
                            else if (value.value === 'Draw') extendedOdds.match_winner!.draw = parseFloat(value.odd);
                            else if (value.value === 'Away') extendedOdds.match_winner!.away = parseFloat(value.odd);
                        });
                        break;
                    case 'Over/Under':
                        extendedOdds.over_under = {
                            over_0_5: 0, over_1_5: 0, over_2_5: 0, over_3_5: 0, over_4_5: 0,
                            under_0_5: 0, under_1_5: 0, under_2_5: 0, under_3_5: 0, under_4_5: 0
                        };
                        bet.values.forEach(value => {
                            const key = value.value.toLowerCase().replace(' ', '_').replace('.', '_');
                            if (key in extendedOdds.over_under!) {
                                (extendedOdds.over_under as any)[key] = parseFloat(value.odd);
                            }
                        });
                        break;
                    case 'Both teams score':
                        extendedOdds.both_teams_score = {
                            yes: 0,
                            no: 0
                        };
                        bet.values.forEach(value => {
                            if (value.value === 'Yes') extendedOdds.both_teams_score!.yes = parseFloat(value.odd);
                            else if (value.value === 'No') extendedOdds.both_teams_score!.no = parseFloat(value.odd);
                        });
                        break;
                    case 'Double Chance':
                        extendedOdds.double_chance = {
                            home_or_draw: 0,
                            home_or_away: 0,
                            draw_or_away: 0
                        };
                        bet.values.forEach(value => {
                            if (value.value === 'Home or Draw') extendedOdds.double_chance!.home_or_draw = parseFloat(value.odd);
                            else if (value.value === 'Home or Away') extendedOdds.double_chance!.home_or_away = parseFloat(value.odd);
                            else if (value.value === 'Draw or Away') extendedOdds.double_chance!.draw_or_away = parseFloat(value.odd);
                        });
                        break;
                    case 'Draw No Bet':
                        extendedOdds.draw_no_bet = {
                            home: 0,
                            away: 0
                        };
                        bet.values.forEach(value => {
                            if (value.value === 'Home') extendedOdds.draw_no_bet!.home = parseFloat(value.odd);
                            else if (value.value === 'Away') extendedOdds.draw_no_bet!.away = parseFloat(value.odd);
                        });
                        break;
                    case 'First Half Winner':
                        extendedOdds.first_half_winner = {
                            home: 0,
                            draw: 0,
                            away: 0
                        };
                        bet.values.forEach(value => {
                            if (value.value === 'Home') extendedOdds.first_half_winner!.home = parseFloat(value.odd);
                            else if (value.value === 'Draw') extendedOdds.first_half_winner!.draw = parseFloat(value.odd);
                            else if (value.value === 'Away') extendedOdds.first_half_winner!.away = parseFloat(value.odd);
                        });
                        break;
                    case 'First Half Goals':
                        extendedOdds.first_half_goals = {
                            over_0_5: 0,
                            over_1_5: 0,
                            under_0_5: 0,
                            under_1_5: 0
                        };
                        bet.values.forEach(value => {
                            const key = value.value.toLowerCase().replace(' ', '_').replace('.', '_');
                            if (key in extendedOdds.first_half_goals!) {
                                (extendedOdds.first_half_goals as any)[key] = parseFloat(value.odd);
                            }
                        });
                        break;
                    case 'Half Time/Full Time':
                        extendedOdds.ht_ft = {
                            home_home: 0, home_draw: 0, home_away: 0,
                            draw_home: 0, draw_draw: 0, draw_away: 0,
                            away_home: 0, away_draw: 0, away_away: 0
                        };
                        bet.values.forEach(value => {
                            const key = value.value.toLowerCase().replace(' ', '_');
                            if (key in extendedOdds.ht_ft!) {
                                (extendedOdds.ht_ft as any)[key] = parseFloat(value.odd);
                            }
                        });
                        break;
                    case 'Correct Score':
                        extendedOdds.correct_score = {};
                        bet.values.forEach(value => {
                            extendedOdds.correct_score![value.value] = parseFloat(value.odd);
                        });
                        break;
                    case 'Exact Goals Number':
                        extendedOdds.exact_goals_number = {};
                        bet.values.forEach(value => {
                            extendedOdds.exact_goals_number![value.value] = parseFloat(value.odd);
                        });
                        break;
                    case 'Goalscorers':
                        extendedOdds.goalscorers = {};
                        bet.values.forEach(value => {
                            extendedOdds.goalscorers![value.value] = parseFloat(value.odd);
                        });
                        break;
                    case 'Clean Sheet':
                        extendedOdds.clean_sheet = {
                            home_yes: 0, home_no: 0,
                            away_yes: 0, away_no: 0
                        };
                        bet.values.forEach(value => {
                            const key = value.value.toLowerCase().replace(' ', '_');
                            if (key in extendedOdds.clean_sheet!) {
                                (extendedOdds.clean_sheet as any)[key] = parseFloat(value.odd);
                            }
                        });
                        break;
                    case 'Win to Nil':
                        extendedOdds.win_to_nil = {
                            home_yes: 0, home_no: 0,
                            away_yes: 0, away_no: 0
                        };
                        bet.values.forEach(value => {
                            const key = value.value.toLowerCase().replace(' ', '_');
                            if (key in extendedOdds.win_to_nil!) {
                                (extendedOdds.win_to_nil as any)[key] = parseFloat(value.odd);
                            }
                        });
                        break;
                    case 'Highest Scoring Half':
                        extendedOdds.highest_scoring_half = {
                            first_half: 0,
                            second_half: 0,
                            equal: 0
                        };
                        bet.values.forEach(value => {
                            const key = value.value.toLowerCase().replace(' ', '_');
                            if (key in extendedOdds.highest_scoring_half!) {
                                (extendedOdds.highest_scoring_half as any)[key] = parseFloat(value.odd);
                            }
                        });
                        break;
                    case 'Odd/Even Goals':
                        extendedOdds.odd_even_goals = {
                            odd: 0,
                            even: 0
                        };
                        bet.values.forEach(value => {
                            if (value.value === 'Odd') extendedOdds.odd_even_goals!.odd = parseFloat(value.odd);
                            else if (value.value === 'Even') extendedOdds.odd_even_goals!.even = parseFloat(value.odd);
                        });
                        break;
                    case 'First Half Goals Odd/Even':
                        extendedOdds.first_half_odd_even = {
                            odd: 0,
                            even: 0
                        };
                        bet.values.forEach(value => {
                            if (value.value === 'Odd') extendedOdds.first_half_odd_even!.odd = parseFloat(value.odd);
                            else if (value.value === 'Even') extendedOdds.first_half_odd_even!.even = parseFloat(value.odd);
                        });
                        break;
                }
            });
        });

        return extendedOdds;
    }
} 
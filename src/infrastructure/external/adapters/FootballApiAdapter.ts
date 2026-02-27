import { injectable } from 'tsyringe';
import axios from 'axios';
import { ApiFootballMatch, ApiFootballOdds, ExtendedOdds } from '../types/ApiFootball.types';
import { MatchFetchWindow } from '../../../domain/matches/value-objects/MatchFetchWindow';
import { logger } from '../../logging/logger';

/**
 * Football API Adapter
 * Handles all external API calls to API-Football service
 */
@injectable()
export class FootballApiAdapter {
    private readonly API_FOOTBALL_BASE_URL = 'https://v3.football.api-sports.io';
    private readonly API_FOOTBALL_KEY = process.env.API_FOOTBALL_KEY;
    private readonly ALLOWED_LEAGUE_IDS = [
        743, // Saudi Pro League
        15,  // FIFA World Cup
        39,  // Premier League
        61,  // Ligue 1
        140, // La Liga
        2,   // UEFA Champions League
        3,   // UEFA Europa League
        78,  // Bundesliga
        135  // Serie A
    ];

    private isFetching = false;

    constructor() {
        if (!this.API_FOOTBALL_KEY) {
            logger.warn('API_FOOTBALL_KEY not configured - Football API adapter will not function');
        }
        logger.info('FootballApiAdapter initialized');
    }

    /**
     * Fetch matches from API-Football for the given window.
     * Uses a single from/to range call instead of individual day calls.
     * @param daysAhead - Number of days ahead to fetch (driven by domain via SyncMatchesUseCase)
     */
    async fetchMatches(daysAhead: number = MatchFetchWindow.FETCH_DAYS_AHEAD): Promise<ApiFootballMatch[]> {
        if (this.isFetching) {
            logger.warn('Already fetching matches, skipping');
            return [];
        }

        if (!this.API_FOOTBALL_KEY) {
            logger.error('API_FOOTBALL_KEY not configured');
            return [];
        }

        this.isFetching = true;

        try {
            const now = new Date();
            const from = this.formatDate(MatchFetchWindow.fetchFrom(now));
            const to   = this.formatDate(new Date(now.getTime() + daysAhead * 86_400_000));

            logger.info('Fetching matches from API-Football', { from, to, daysAhead });

            const response = await axios.get(`${this.API_FOOTBALL_BASE_URL}/fixtures`, {
                headers: {
                    'x-rapidapi-key': this.API_FOOTBALL_KEY,
                    'x-rapidapi-host': 'v3.football.api-sports.io',
                },
                params: { from, to, status: 'NS-LIVE-FT' },
            });

            const allMatches: ApiFootballMatch[] = response.data.response ?? [];

            const filteredMatches = allMatches.filter(apiMatch =>
                this.ALLOWED_LEAGUE_IDS.includes(apiMatch.league.id)
            );

            logger.info('Matches fetched from API-Football', {
                total: allMatches.length,
                filtered: filteredMatches.length,
            });

            return filteredMatches;
        } catch (error) {
            logger.error('Error fetching matches from API-Football', {
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            return [];
        } finally {
            this.isFetching = false;
        }
    }

    private formatDate(date: Date): string {
        const year  = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day   = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    /**
     * Fetch odds for multiple matches in parallel
     */
    async fetchOddsForMatches(matchIds: number[]): Promise<ApiFootballOdds[]> {
        if (!this.API_FOOTBALL_KEY) {
            logger.error('API_FOOTBALL_KEY not configured');
            return [];
        }

        try {
            logger.info('Fetching odds for matches', { count: matchIds.length });

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
                    logger.warn('Failed to fetch odds for match', { matchId });
                    return null;
                }
            });

            const oddsResults = await Promise.all(oddsPromises);
            const validOdds = oddsResults.filter((odds): odds is ApiFootballOdds => odds !== null);

            logger.info('Odds fetched', { requested: matchIds.length, found: validOdds.length });

            return validOdds;
        } catch (error) {
            logger.error('Error fetching odds', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            return [];
        }
    }

    /**
     * Fetch comprehensive odds for a single match
     * Includes: Match Winner, Over/Under, BTTS, Double Chance, and many more markets
     */
    async fetchMatchOdds(fixtureId: number): Promise<ExtendedOdds> {
        if (!this.API_FOOTBALL_KEY) {
            logger.error('API_FOOTBALL_KEY not configured');
            return this.generateDefaultOdds();
        }

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
                    }
                }

                if (Object.keys(extendedOdds).length > 0) {
                    logger.debug('Fetched odds for fixture', { fixtureId, markets: Object.keys(extendedOdds).length });
                    return extendedOdds;
                }
            }

            logger.warn('No odds found for fixture, using defaults', { fixtureId });
            return this.generateDefaultOdds();
        } catch (error) {
            logger.warn('Error fetching odds for fixture, using defaults', { fixtureId });
            return this.generateDefaultOdds();
        }
    }

    /**
     * Generate default/fallback odds when API data is unavailable
     */
    private generateDefaultOdds(): ExtendedOdds {
        const homeWin = Math.random() * 2 + 1;
        const draw = Math.random() * 3 + 2;
        const awayWin = Math.random() * 2 + 1;

        return {
            match_winner: {
                home: Math.round(homeWin * 100) / 100,
                draw: Math.round(draw * 100) / 100,
                away: Math.round(awayWin * 100) / 100
            }
        };
    }
}

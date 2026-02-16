import { injectable, inject } from 'tsyringe';
import { IMatchRepository } from '../../../domain/matches/repositories/IMatchRepository';
import { FootballApiAdapter } from '../../../infrastructure/external/adapters/FootballApiAdapter';
import { BettingContractDeploymentAdapter } from '../../../infrastructure/blockchain/adapters/BettingContractDeploymentAdapter';
import { MarketOddsAdapter } from '../../../infrastructure/blockchain/adapters/MarketOddsAdapter';
import { Match, MatchOdds } from '../../../domain/matches/entities/Match';
import { ApiFootballOdds, ExtendedOdds } from '../../../infrastructure/external/types/ApiFootball.types';
import { logger } from '../../../infrastructure/logging/logger';

export interface SyncMatchesResult {
    matchesFetched: number;
    matchesStored: number;
    contractsDeployed: number;
}

/**
 * Sync Matches Use Case
 * Orchestrates the complete match synchronization process:
 * 1. Fetch matches from API-Football
 * 2. Fetch odds for those matches
 * 3. Store matches in database
 * 4. Deploy betting contracts for new matches
 * 5. Sync odds to existing contracts
 */
@injectable()
export class SyncMatchesUseCase {
    constructor(
        @inject('IMatchRepository') private readonly matchRepository: IMatchRepository,
        @inject(FootballApiAdapter) private readonly footballApiAdapter: FootballApiAdapter,
        @inject(BettingContractDeploymentAdapter) private readonly bettingDeploymentAdapter: BettingContractDeploymentAdapter,
        @inject(MarketOddsAdapter) private readonly marketOddsAdapter: MarketOddsAdapter
    ) {}

    async execute(): Promise<SyncMatchesResult> {
        try {
            logger.info('Starting match synchronization');

            // Step 1: Fetch matches from API-Football
            const apiMatches = await this.footballApiAdapter.fetchMatches();
            logger.info('Matches fetched from API', { count: apiMatches.length });

            if (apiMatches.length === 0) {
                return { matchesFetched: 0, matchesStored: 0, contractsDeployed: 0 };
            }

            // Step 2: Fetch odds for these matches
            const matchIds = apiMatches.map(m => m.fixture.id);
            const oddsData = await this.footballApiAdapter.fetchOddsForMatches(matchIds);
            logger.info('Odds fetched from API', { count: oddsData.length });

            // Create odds map for quick lookup
            const oddsMap = new Map<number, ApiFootballOdds>();
            oddsData.forEach(odds => {
                if (odds.fixture?.id) {
                    oddsMap.set(odds.fixture.id, odds);
                }
            });

            // Step 3: Transform API matches to domain entities and store
            let matchesStored = 0;
            let contractsDeployed = 0;

            for (const apiMatch of apiMatches) {
                try {
                    // Parse odds
                    const odds = oddsMap.get(apiMatch.fixture.id);
                    const extendedOdds = this.parseOdds(odds);
                    const matchOdds = this.convertToMatchOdds(extendedOdds);

                    // Check if match already exists
                    const existingMatch = await this.matchRepository.findByApiFootballId(apiMatch.fixture.id);

                    if (existingMatch) {
                        // Update existing match
                        const existingJson = existingMatch.toJSON();
                        const updatedMatch = Match.reconstitute({
                            id: existingJson.id,
                            apiFootballId: apiMatch.fixture.id,
                            homeTeamId: existingJson.homeTeam.id,
                            homeTeamName: apiMatch.teams.home.name,
                            homeTeamLogo: apiMatch.teams.home.logo,
                            awayTeamId: existingJson.awayTeam.id,
                            awayTeamName: apiMatch.teams.away.name,
                            awayTeamLogo: apiMatch.teams.away.logo,
                            leagueId: existingJson.league.id,
                            leagueName: apiMatch.league.name,
                            leagueLogo: apiMatch.league.logo,
                            leagueCountry: apiMatch.league.country,
                            status: this.mapApiStatus(apiMatch.fixture.status.short),
                            matchDate: new Date(apiMatch.fixture.date),
                            venue: apiMatch.fixture.venue?.name,
                            homeScore: apiMatch.goals.home ?? undefined,
                            awayScore: apiMatch.goals.away ?? undefined,
                            odds: matchOdds,
                            bettingContractAddress: existingMatch.getBettingContractAddress(),
                            createdAt: existingJson.createdAt,
                            updatedAt: new Date()
                        });

                        await this.matchRepository.update(updatedMatch);
                        matchesStored++;

                        // Sync odds to blockchain if contract exists
                        const contractAddress = existingMatch.getBettingContractAddress();
                        if (contractAddress && extendedOdds) {
                            try {
                                await this.marketOddsAdapter.syncOddsForMatch(contractAddress, extendedOdds);
                            } catch (err) {
                                logger.warn('Failed to sync odds to blockchain', {
                                    matchId: apiMatch.fixture.id,
                                    error: err instanceof Error ? err.message : 'Unknown error'
                                });
                            }
                        }
                    } else {
                        // Create new match
                        const newMatch = Match.create({
                            id: apiMatch.fixture.id, // Use API fixture ID as primary key
                            apiFootballId: apiMatch.fixture.id,
                            homeTeamId: 0, // Will be set by repository if needed
                            homeTeamName: apiMatch.teams.home.name,
                            homeTeamLogo: apiMatch.teams.home.logo,
                            awayTeamId: 0, // Will be set by repository if needed
                            awayTeamName: apiMatch.teams.away.name,
                            awayTeamLogo: apiMatch.teams.away.logo,
                            leagueId: apiMatch.league.id,
                            leagueName: apiMatch.league.name,
                            leagueLogo: apiMatch.league.logo,
                            leagueCountry: apiMatch.league.country,
                            status: this.mapApiStatus(apiMatch.fixture.status.short),
                            matchDate: new Date(apiMatch.fixture.date),
                            venue: apiMatch.fixture.venue?.name,
                            homeScore: apiMatch.goals.home ?? undefined,
                            awayScore: apiMatch.goals.away ?? undefined,
                            odds: matchOdds
                        });

                        const savedMatch = await this.matchRepository.save(newMatch);
                        matchesStored++;

                        // Deploy betting contract for new match if odds are available
                        if (extendedOdds && extendedOdds.match_winner) {
                            try {
                                const matchName = `${apiMatch.teams.home.name} vs ${apiMatch.teams.away.name}`;
                                const ownerAddress = this.bettingDeploymentAdapter.getAdminAddress();

                                const contractAddress = await this.bettingDeploymentAdapter.deployFootballMatch(
                                    matchName,
                                    ownerAddress
                                );

                                // Setup default markets
                                await this.bettingDeploymentAdapter.setupDefaultMarkets(contractAddress, {
                                    homeWin: extendedOdds.match_winner.home,
                                    draw: extendedOdds.match_winner.draw,
                                    awayWin: extendedOdds.match_winner.away,
                                    over25: extendedOdds.over_under?.over_2_5,
                                    under25: extendedOdds.over_under?.under_2_5,
                                    bttsYes: extendedOdds.both_teams_score?.yes,
                                    bttsNo: extendedOdds.both_teams_score?.no
                                });

                                // Update match with contract address
                                const matchWithContract = Match.reconstitute({
                                    ...savedMatch.toJSON(),
                                    bettingContractAddress: contractAddress
                                });
                                await this.matchRepository.update(matchWithContract);

                                contractsDeployed++;
                                logger.info('Betting contract deployed', {
                                    matchId: apiMatch.fixture.id,
                                    contractAddress
                                });
                            } catch (err) {
                                logger.error('Failed to deploy betting contract', {
                                    matchId: apiMatch.fixture.id,
                                    error: err instanceof Error ? err.message : 'Unknown error'
                                });
                            }
                        }
                    }
                } catch (err) {
                    logger.error('Failed to process match', {
                        matchId: apiMatch.fixture.id,
                        error: err instanceof Error ? err.message : 'Unknown error'
                    });
                }
            }

            logger.info('Match synchronization completed', {
                matchesFetched: apiMatches.length,
                matchesStored,
                contractsDeployed
            });

            return {
                matchesFetched: apiMatches.length,
                matchesStored,
                contractsDeployed
            };
        } catch (error) {
            logger.error('Match synchronization failed', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }

    /**
     * Parse API odds to ExtendedOdds format
     */
    private parseOdds(oddsData?: ApiFootballOdds): ExtendedOdds | null {
        if (!oddsData || !oddsData.bookmakers || oddsData.bookmakers.length === 0) {
            return null;
        }

        const bookmaker = oddsData.bookmakers[0];
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

        return Object.keys(extendedOdds).length > 0 ? extendedOdds : null;
    }

    /**
     * Convert ExtendedOdds to MatchOdds format
     */
    private convertToMatchOdds(extendedOdds: ExtendedOdds | null): MatchOdds | undefined {
        if (!extendedOdds || !extendedOdds.match_winner) {
            return undefined;
        }

        return {
            homeWin: extendedOdds.match_winner.home,
            draw: extendedOdds.match_winner.draw,
            awayWin: extendedOdds.match_winner.away
        };
    }

    /**
     * Map API-Football status codes to domain status
     */
    private mapApiStatus(apiStatus: string): string {
        const statusMap: Record<string, string> = {
            'NS': 'NS',      // Not Started
            'LIVE': 'LIVE',  // In Play
            '1H': 'LIVE',    // First Half
            'HT': 'LIVE',    // Halftime
            '2H': 'LIVE',    // Second Half
            'ET': 'LIVE',    // Extra Time
            'P': 'LIVE',     // Penalty
            'FT': 'FT',      // Full Time
            'AET': 'FT',     // After Extra Time
            'PEN': 'FT',     // Penalties
            'PST': 'PST',    // Postponed
            'CANC': 'CANC',  // Cancelled
            'ABD': 'ABD',    // Abandoned
            'AWD': 'AWD',    // Technical Loss
            'WO': 'WO'       // WalkOver
        };

        return statusMap[apiStatus] || apiStatus;
    }
}

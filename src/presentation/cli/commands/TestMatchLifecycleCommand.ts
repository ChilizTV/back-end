import { injectable, inject } from 'tsyringe';
import * as readline from 'readline';
import { IMatchRepository } from '../../../domain/matches/repositories/IMatchRepository';
import { BettingContractDeploymentAdapter } from '../../../infrastructure/blockchain/adapters/BettingContractDeploymentAdapter';
import { Match } from '../../../domain/matches/entities/Match';
import { logger } from '../../../infrastructure/logging/logger';

/**
 * Test Match Lifecycle Command
 * Interactive script to test match creation, status updates, and contract deployment
 */
@injectable()
export class TestMatchLifecycleCommand {
    private readonly TEST_MATCH_ID = 999003;
    private readonly DEFAULT_ODDS = {
        homeWin: 2.1,
        draw: 3.2,
        awayWin: 3.5,
        over25: 1.85,
        under25: 1.95,
        bttsYes: 1.7,
        bttsNo: 2.1,
    };

    constructor(
        @inject('IMatchRepository') private readonly matchRepository: IMatchRepository,
        @inject(BettingContractDeploymentAdapter) private readonly deploymentAdapter: BettingContractDeploymentAdapter
    ) {}

    private ask(question: string): Promise<string> {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        return new Promise((resolve) => {
            rl.question(question, (answer) => {
                rl.close();
                resolve((answer || '').trim());
            });
        });
    }

    private printMenu(): void {
        logger.info('─────────────────────────────────────────');
        logger.info(`  TEST MATCH LIFECYCLE (id=${this.TEST_MATCH_ID})`);
        logger.info('─────────────────────────────────────────');
        logger.info('  1  - Create match + deploy contract (status: not started NS)');
        logger.info('  2  - Set match to live (1H, score 0-0)');
        logger.info('  3  - Finish match with score (FT)');
        logger.info('  4  - Show match status');
        logger.info('  q  - Quit');
        logger.info('─────────────────────────────────────────');
    }

    private async createTestMatch(): Promise<void> {
        const matchDate = new Date();
        matchDate.setHours(matchDate.getHours() + 2);

        // Create match entity
        const match = Match.create({
            id: this.TEST_MATCH_ID,
            apiFootballId: this.TEST_MATCH_ID,
            homeTeamId: 1,
            homeTeamName: 'Stade Rennais',
            homeTeamLogo: '',
            awayTeamId: 2,
            awayTeamName: 'Monaco',
            awayTeamLogo: '',
            leagueId: 1,
            leagueName: 'Ligue 1',
            leagueLogo: '',
            leagueCountry: 'France',
            season: new Date().getFullYear(),
            matchDate,
            status: 'NS',
            venue: 'Rhoazon Park',
            odds: this.DEFAULT_ODDS,
        });

        // Save match
        await this.matchRepository.save(match);

        // Deploy contract
        const matchName = `Stade Rennais vs Monaco`;
        const ownerAddress = this.deploymentAdapter.getAdminAddress();

        logger.info('Deploying FootballMatch contract');
        const contractAddress = await this.deploymentAdapter.deployFootballMatch(matchName, ownerAddress);

        // Setup markets
        await this.deploymentAdapter.setupDefaultMarkets(contractAddress, this.DEFAULT_ODDS);

        // Update match with contract address
        const matchJson = match.toJSON();
        const matchWithContract = Match.reconstitute({
            id: matchJson.id,
            apiFootballId: matchJson.apiFootballId,
            homeTeamId: matchJson.homeTeam.id,
            homeTeamName: matchJson.homeTeam.name,
            homeTeamLogo: matchJson.homeTeam.logo,
            awayTeamId: matchJson.awayTeam.id,
            awayTeamName: matchJson.awayTeam.name,
            awayTeamLogo: matchJson.awayTeam.logo,
            leagueId: matchJson.league.id,
            leagueName: matchJson.league.name,
            leagueLogo: matchJson.league.logo,
            leagueCountry: matchJson.league.country,
            season: matchJson.season,
            status: matchJson.status,
            matchDate: new Date(matchJson.matchDate),
            venue: matchJson.venue,
            homeScore: matchJson.score?.home,
            awayScore: matchJson.score?.away,
            odds: matchJson.odds,
            bettingContractAddress: contractAddress,
            createdAt: new Date(matchJson.createdAt),
            updatedAt: new Date(matchJson.updatedAt)
        });
        await this.matchRepository.update(matchWithContract);

        logger.info('Test match created and contract deployed', {
            apiFootballId: this.TEST_MATCH_ID,
            contractAddress
        });
    }

    private async setMatchLive(apiFootballId: number): Promise<void> {
        const match = await this.matchRepository.findByApiFootballId(apiFootballId);
        if (!match) {
            throw new Error(`Match ${apiFootballId} not found`);
        }

        const matchJson = match.toJSON();
        const updatedMatch = Match.reconstitute({
            id: matchJson.id,
            apiFootballId: matchJson.apiFootballId,
            homeTeamId: matchJson.homeTeam.id,
            homeTeamName: matchJson.homeTeam.name,
            homeTeamLogo: matchJson.homeTeam.logo,
            awayTeamId: matchJson.awayTeam.id,
            awayTeamName: matchJson.awayTeam.name,
            awayTeamLogo: matchJson.awayTeam.logo,
            leagueId: matchJson.league.id,
            leagueName: matchJson.league.name,
            leagueLogo: matchJson.league.logo,
            leagueCountry: matchJson.league.country,
            season: matchJson.season,
            status: '1H',
            matchDate: new Date(matchJson.matchDate),
            venue: matchJson.venue,
            homeScore: 0,
            awayScore: 0,
            odds: matchJson.odds,
            bettingContractAddress: matchJson.bettingContractAddress,
            createdAt: new Date(matchJson.createdAt),
            updatedAt: new Date()
        });

        await this.matchRepository.update(updatedMatch);
        logger.info('Match set to live', { apiFootballId, period: '1H', score: '0-0' });
    }

    private async setMatchFinished(apiFootballId: number, homeScore: number, awayScore: number): Promise<void> {
        const match = await this.matchRepository.findByApiFootballId(apiFootballId);
        if (!match) {
            throw new Error(`Match ${apiFootballId} not found`);
        }

        const matchJson = match.toJSON();
        const updatedMatch = Match.reconstitute({
            id: matchJson.id,
            apiFootballId: matchJson.apiFootballId,
            homeTeamId: matchJson.homeTeam.id,
            homeTeamName: matchJson.homeTeam.name,
            homeTeamLogo: matchJson.homeTeam.logo,
            awayTeamId: matchJson.awayTeam.id,
            awayTeamName: matchJson.awayTeam.name,
            awayTeamLogo: matchJson.awayTeam.logo,
            leagueId: matchJson.league.id,
            leagueName: matchJson.league.name,
            leagueLogo: matchJson.league.logo,
            leagueCountry: matchJson.league.country,
            season: matchJson.season,
            status: 'FT',
            matchDate: new Date(matchJson.matchDate),
            venue: matchJson.venue,
            homeScore,
            awayScore,
            odds: matchJson.odds,
            bettingContractAddress: matchJson.bettingContractAddress,
            createdAt: new Date(matchJson.createdAt),
            updatedAt: new Date()
        });

        await this.matchRepository.update(updatedMatch);
        logger.info('Match set to finished', {
            apiFootballId,
            status: 'FT',
            score: `${homeScore}-${awayScore}`,
            note: 'The sync-matches cron will resolve markets on-chain after next sync run'
        });
    }

    private async showStatus(apiFootballId: number): Promise<void> {
        const match = await this.matchRepository.findByApiFootballId(apiFootballId);
        if (!match) {
            throw new Error(`Match ${apiFootballId} not found`);
        }

        const matchJson = match.toJSON();
        logger.info('Match status', {
            match: `${matchJson.homeTeam.name} vs ${matchJson.awayTeam.name}`,
            apiFootballId: matchJson.apiFootballId,
            status: matchJson.status,
            score: `${matchJson.homeScore ?? '-'} - ${matchJson.awayScore ?? '-'}`,
            contract: matchJson.bettingContractAddress ?? '(none)'
        });
    }

    async executeInteractive(): Promise<void> {
        for (;;) {
            this.printMenu();
            const choice = await this.ask('Your choice (1/2/3/4/q): ');

            if (choice === 'q' || choice === 'Q') {
                logger.info('Goodbye');
                return;
            }

            try {
                if (choice === '1') {
                    await this.createTestMatch();
                } else if (choice === '2') {
                    await this.setMatchLive(this.TEST_MATCH_ID);
                } else if (choice === '3') {
                    const scoreInput = await this.ask('Score (e.g. 2 1 for 2-1): ');
                    const parts = scoreInput.split(/\s+/);
                    const h = parseInt(parts[0] ?? '0', 10);
                    const a = parseInt(parts[1] ?? '0', 10);
                    if (Number.isNaN(h) || Number.isNaN(a)) {
                        logger.warn('Enter two numbers (e.g. 2 1)');
                    } else {
                        await this.setMatchFinished(this.TEST_MATCH_ID, h, a);
                    }
                } else if (choice === '4') {
                    await this.showStatus(this.TEST_MATCH_ID);
                } else {
                    logger.warn('Invalid choice. Type 1, 2, 3, 4 or q');
                }
            } catch (err: any) {
                logger.error('Error in interactive menu', { error: err?.message ?? err });
            }
        }
    }

    async executeCli(command: string, args: string[]): Promise<void> {
        const getMatchId = (): number => {
            const id = args[0];
            if (id !== undefined) {
                const n = parseInt(id, 10);
                if (!Number.isNaN(n)) return n;
            }
            return this.TEST_MATCH_ID;
        };

        switch (command) {
            case 'create':
                await this.createTestMatch();
                break;

            case 'live':
                await this.setMatchLive(getMatchId());
                break;

            case 'finished': {
                let id: number;
                let h: number;
                let a: number;

                if (args.length === 3) {
                    id = parseInt(args[0]!, 10);
                    h = parseInt(args[1]!, 10);
                    a = parseInt(args[2]!, 10);
                } else if (args.length === 2) {
                    id = this.TEST_MATCH_ID;
                    h = parseInt(args[0]!, 10);
                    a = parseInt(args[1]!, 10);
                } else {
                    throw new Error('Usage: finished [id] <home_score> <away_score>');
                }

                if (Number.isNaN(id) || Number.isNaN(h) || Number.isNaN(a)) {
                    throw new Error('Usage: finished [id] <home_score> <away_score>');
                }

                await this.setMatchFinished(id, h, a);
                break;
            }

            case 'status':
                await this.showStatus(getMatchId());
                break;

            default:
                logger.info('Usage:');
                logger.info('  npx ts-node src/presentation/cli/test-match-lifecycle.ts           # Interactive menu');
                logger.info('  npx ts-node src/presentation/cli/test-match-lifecycle.ts create');
                logger.info('  npx ts-node src/presentation/cli/test-match-lifecycle.ts live [id]');
                logger.info('  npx ts-node src/presentation/cli/test-match-lifecycle.ts finished [id] <home> <away>');
                logger.info('  npx ts-node src/presentation/cli/test-match-lifecycle.ts status [id]');
                logger.info(`[id] default = ${this.TEST_MATCH_ID}`);
                throw new Error('Invalid command');
        }
    }

    async execute(argv: string[]): Promise<void> {
        try {
            const command = argv[2]?.toLowerCase();

            if (!command) {
                // Interactive menu
                await this.executeInteractive();
            } else {
                // CLI mode
                const args = argv.slice(3);
                await this.executeCli(command, args);
            }
        } catch (error) {
            logger.error('Test match lifecycle command failed', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }
}

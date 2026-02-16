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
    private readonly TEST_MATCH_ID = 999001;
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
        console.log('\n─────────────────────────────────────────');
        console.log(`  TEST MATCH LIFECYCLE (id=${this.TEST_MATCH_ID})`);
        console.log('─────────────────────────────────────────');
        console.log('  1  - Create match + deploy contract (status: not started NS)');
        console.log('  2  - Set match to live (1H, score 0-0)');
        console.log('  3  - Finish match with score (FT)');
        console.log('  4  - Show match status');
        console.log('  q  - Quit');
        console.log('─────────────────────────────────────────');
    }

    private async createTestMatch(): Promise<void> {
        const matchDate = new Date();
        matchDate.setHours(matchDate.getHours() + 2);

        // Create match entity
        const match = Match.create({
            id: this.TEST_MATCH_ID,
            apiFootballId: this.TEST_MATCH_ID,
            homeTeamId: 1,
            homeTeamName: 'Test Team A',
            homeTeamLogo: '',
            awayTeamId: 2,
            awayTeamName: 'Test Team B',
            awayTeamLogo: '',
            leagueId: 1,
            leagueName: 'Test League',
            leagueLogo: '',
            leagueCountry: 'Test',
            matchDate,
            status: 'NS',
            venue: 'Test Stadium',
            odds: this.DEFAULT_ODDS,
        });

        // Save match
        await this.matchRepository.save(match);

        // Deploy contract
        const matchName = `Test Team A vs Test Team B`;
        const ownerAddress = this.deploymentAdapter.getAdminAddress();

        console.log('🎯 Deploying FootballMatch contract...');
        const contractAddress = await this.deploymentAdapter.deployFootballMatch(matchName, ownerAddress);

        // Setup markets
        await this.deploymentAdapter.setupDefaultMarkets(contractAddress, this.DEFAULT_ODDS);

        // Update match with contract address
        const matchJson = match.toJSON();
        const matchWithContract = Match.reconstitute({
            ...matchJson,
            bettingContractAddress: contractAddress
        });
        await this.matchRepository.update(matchWithContract);

        console.log('\n✅ Test match created and contract deployed.');
        console.log(`   api_football_id: ${this.TEST_MATCH_ID}`);
        console.log(`   contract:        ${contractAddress}`);
    }

    private async setMatchLive(apiFootballId: number): Promise<void> {
        const match = await this.matchRepository.findByApiFootballId(apiFootballId);
        if (!match) {
            throw new Error(`Match ${apiFootballId} not found`);
        }

        const matchJson = match.toJSON();
        const updatedMatch = Match.reconstitute({
            ...matchJson,
            status: '1H',
            homeScore: 0,
            awayScore: 0,
        });

        await this.matchRepository.update(updatedMatch);
        console.log(`✅ Match ${apiFootballId} set to live (1H), score 0-0.`);
    }

    private async setMatchFinished(apiFootballId: number, homeScore: number, awayScore: number): Promise<void> {
        const match = await this.matchRepository.findByApiFootballId(apiFootballId);
        if (!match) {
            throw new Error(`Match ${apiFootballId} not found`);
        }

        const matchJson = match.toJSON();
        const updatedMatch = Match.reconstitute({
            ...matchJson,
            status: 'FT',
            homeScore,
            awayScore,
        });

        await this.matchRepository.update(updatedMatch);
        console.log(`✅ Match ${apiFootballId} set to finished (FT), score ${homeScore}-${awayScore}.`);
        console.log('   The sync-matches cron will resolve markets on-chain right after the next sync run.');
    }

    private async showStatus(apiFootballId: number): Promise<void> {
        const match = await this.matchRepository.findByApiFootballId(apiFootballId);
        if (!match) {
            throw new Error(`Match ${apiFootballId} not found`);
        }

        const matchJson = match.toJSON();
        console.log('📋 Match:', matchJson.homeTeam.name, 'vs', matchJson.awayTeam.name);
        console.log('   api_football_id:', matchJson.apiFootballId);
        console.log('   status:         ', matchJson.status);
        console.log('   score:          ', matchJson.homeScore ?? '-', '-', matchJson.awayScore ?? '-');
        console.log('   contract:       ', matchJson.bettingContractAddress ?? '(none)');
    }

    async executeInteractive(): Promise<void> {
        for (;;) {
            this.printMenu();
            const choice = await this.ask('Your choice (1/2/3/4/q): ');

            if (choice === 'q' || choice === 'Q') {
                console.log('Goodbye.');
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
                        console.log('❌ Enter two numbers (e.g. 2 1).');
                    } else {
                        await this.setMatchFinished(this.TEST_MATCH_ID, h, a);
                    }
                } else if (choice === '4') {
                    await this.showStatus(this.TEST_MATCH_ID);
                } else {
                    console.log('Invalid choice. Type 1, 2, 3, 4 or q.');
                }
            } catch (err: any) {
                console.error('❌ Error:', err?.message ?? err);
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
                console.log('Usage:');
                console.log('  npx ts-node src/presentation/cli/test-match-lifecycle.ts           # Interactive menu');
                console.log('  npx ts-node src/presentation/cli/test-match-lifecycle.ts create');
                console.log('  npx ts-node src/presentation/cli/test-match-lifecycle.ts live [id]');
                console.log('  npx ts-node src/presentation/cli/test-match-lifecycle.ts finished [id] <home> <away>');
                console.log('  npx ts-node src/presentation/cli/test-match-lifecycle.ts status [id]');
                console.log(`\n[id] default = ${this.TEST_MATCH_ID}`);
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

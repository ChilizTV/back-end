import { injectable, inject } from 'tsyringe';
import { IMatchRepository } from '../../../domain/matches/repositories/IMatchRepository';
import { BettingContractDeploymentAdapter } from '../../../infrastructure/blockchain/adapters/BettingContractDeploymentAdapter';
import { logger } from '../../../infrastructure/logging/logger';

/**
 * Setup Markets Command
 * Configures betting markets for contracts that exist but lack markets
 */
@injectable()
export class SetupMarketsCommand {
    constructor(
        @inject('IMatchRepository') private readonly matchRepository: IMatchRepository,
        @inject(BettingContractDeploymentAdapter) private readonly deploymentAdapter: BettingContractDeploymentAdapter
    ) {}

    async execute(): Promise<void> {
        try {
            console.log('🚀 Searching for contracts without markets...\n');

            // Get all matches with contracts
            const allMatches = await this.matchRepository.findAll();
            const matchesWithContract = allMatches.filter(m => !!m.getBettingContractAddress());

            if (matchesWithContract.length === 0) {
                console.log('✅ No matches with contracts found.');
                return;
            }

            let setupCount = 0;
            let skippedCount = 0;
            let failedCount = 0;

            for (const match of matchesWithContract) {
                const matchJson = match.toJSON();
                const matchName = `${matchJson.homeTeam.name} vs ${matchJson.awayTeam.name}`;
                const contractAddress = match.getBettingContractAddress()!;

                console.log(`\n🎲 [${match.getId()}] ${matchName}`);
                console.log(`   Contract: ${contractAddress}`);

                try {
                    // Check if markets exist
                    const count = await this.deploymentAdapter.getMarketCount(contractAddress);

                    if (count > 0) {
                        console.log(`   ⏭️  ${count} market(s) already configured, skip.`);
                        skippedCount++;
                        continue;
                    }

                    // Setup markets
                    await this.deploymentAdapter.setupDefaultMarkets(contractAddress, {
                        homeWin: matchJson.odds?.homeWin,
                        draw: matchJson.odds?.draw,
                        awayWin: matchJson.odds?.awayWin,
                        over25: undefined,
                        under25: undefined,
                        bttsYes: undefined,
                        bttsNo: undefined
                    });

                    console.log(`   ✅ Markets configured`);
                    setupCount++;

                    // Pause between setups
                    await new Promise(resolve => setTimeout(resolve, 2000));
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    console.error(`   ❌ Error: ${errorMessage}`);
                    failedCount++;
                }
            }

            console.log('\n📊 Summary:');
            console.log(`   Configured: ${setupCount}`);
            console.log(`   Skipped: ${skippedCount}`);
            console.log(`   Failed: ${failedCount}`);
            console.log('\n✅ Completed.');
        } catch (error) {
            logger.error('Setup markets command failed', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }
}

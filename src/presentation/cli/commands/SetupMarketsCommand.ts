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
            logger.info('Searching for contracts without markets');

            // Get all matches with contracts
            const allMatches = await this.matchRepository.findAll();
            const matchesWithContract = allMatches.filter(m => !!m.getBettingContractAddress());

            if (matchesWithContract.length === 0) {
                logger.info('No matches with contracts found');
                return;
            }

            let setupCount = 0;
            let skippedCount = 0;
            let failedCount = 0;

            for (const match of matchesWithContract) {
                const matchJson = match.toJSON();
                const matchName = `${matchJson.homeTeam.name} vs ${matchJson.awayTeam.name}`;
                const contractAddress = match.getBettingContractAddress()!;

                logger.info('Processing match', { matchId: match.getId(), matchName, contractAddress });

                try {
                    // Check if markets exist
                    const count = await this.deploymentAdapter.getMarketCount(contractAddress);

                    if (count > 0) {
                        logger.info('Markets already configured, skipping', { count, matchId: match.getId() });
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

                    logger.info('Markets configured successfully', { matchId: match.getId() });
                    setupCount++;

                    // Pause between setups
                    await new Promise(resolve => setTimeout(resolve, 2000));
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    logger.error('Error setting up markets', { error: errorMessage, matchId: match.getId() });
                    failedCount++;
                }
            }

            logger.info('Setup markets summary', {
                configured: setupCount,
                skipped: skippedCount,
                failed: failedCount
            });
        } catch (error) {
            logger.error('Setup markets command failed', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }
}

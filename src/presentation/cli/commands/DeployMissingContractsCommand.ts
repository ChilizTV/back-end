import { injectable, inject } from 'tsyringe';
import { IMatchRepository } from '../../../domain/matches/repositories/IMatchRepository';
import { BettingContractDeploymentAdapter } from '../../../infrastructure/blockchain/adapters/BettingContractDeploymentAdapter';
import { logger } from '../../../infrastructure/logging/logger';

/**
 * Deploy Missing Contracts Command
 * Deploys BettingMatch contracts for matches without a contract address
 */
@injectable()
export class DeployMissingContractsCommand {
    constructor(
        @inject('IMatchRepository') private readonly matchRepository: IMatchRepository,
        @inject(BettingContractDeploymentAdapter) private readonly deploymentAdapter: BettingContractDeploymentAdapter
    ) {}

    async execute(): Promise<void> {
        try {
            logger.info('Searching for matches without betting contract');

            // Get all matches
            const allMatches = await this.matchRepository.findAll();

            // Filter matches without contract
            const matchesToDeploy = allMatches.filter(m => !m.getBettingContractAddress());

            if (matchesToDeploy.length === 0) {
                logger.info('No matches without contract found. All matches already have a contract address.');
                return;
            }

            logger.info('Matches without contract found', { count: matchesToDeploy.length });

            const ownerAddress = this.deploymentAdapter.getAdminAddress();
            let deployedCount = 0;
            let failedCount = 0;

            for (const match of matchesToDeploy) {
                const matchJson = match.toJSON();
                const matchName = `${matchJson.homeTeam.name} vs ${matchJson.awayTeam.name}`;
                logger.info('Processing match', { matchId: match.getId(), matchName });

                try {
                    // Deploy contract
                    const contractAddress = await this.deploymentAdapter.deployFootballMatch(
                        matchName,
                        ownerAddress
                    );

                    // Setup markets with odds if available
                    const odds = matchJson.odds;
                    await this.deploymentAdapter.setupDefaultMarkets(contractAddress, {
                        homeWin: odds?.homeWin,
                        draw: odds?.draw,
                        awayWin: odds?.awayWin,
                        over25: undefined,
                        under25: undefined,
                        bttsYes: undefined,
                        bttsNo: undefined
                    });

                    // Update match with contract address
                    const updatedMatch = match.toJSON();
                    const reconstitutedMatch = await this.matchRepository.findById(match.getId());
                    if (reconstitutedMatch) {
                        // Create a new instance with the contract address
                        const matchWithContract = match.constructor.name === 'Match'
                            ? (match.constructor as any).reconstitute({
                                ...updatedMatch,
                                bettingContractAddress: contractAddress
                            })
                            : match;

                        await this.matchRepository.update(matchWithContract);

                        logger.info('Contract deployed and saved', { contractAddress, matchId: match.getId() });
                        deployedCount++;
                    }

                    // Pause between deployments
                    await new Promise(resolve => setTimeout(resolve, 2000));
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    logger.error('Deployment error', { error: errorMessage, matchId: match.getId() });
                    failedCount++;

                    if (errorMessage.includes('MCOPY') || errorMessage.includes('invalid opcode')) {
                        logger.warn('Network may not support contract opcodes (evmVersion cancun)');
                    }
                }
            }

            logger.info('Deployment summary', {
                deployedSuccessfully: deployedCount,
                failed: failedCount,
                totalProcessed: matchesToDeploy.length
            });
        } catch (error) {
            logger.error('Deploy missing contracts command failed', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }
}

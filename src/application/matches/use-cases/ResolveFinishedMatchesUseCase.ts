import { injectable, inject } from 'tsyringe';
import { IMatchRepository } from '../../../domain/matches/repositories/IMatchRepository';
import { MatchResolutionAdapter } from '../../../infrastructure/blockchain/adapters/MatchResolutionAdapter';
import { logger } from '../../../infrastructure/logging/logger';

export interface ResolveFinishedMatchesResult {
    matchesProcessed: number;
    marketsResolved: number;
}

@injectable()
export class ResolveFinishedMatchesUseCase {
    constructor(
        @inject('IMatchRepository')
        private readonly matchRepository: IMatchRepository,
        private readonly matchResolutionAdapter: MatchResolutionAdapter
    ) {}

    async execute(): Promise<ResolveFinishedMatchesResult> {
        // Fetch all finished matches
        const allMatches = await this.matchRepository.findAll();

        // Filter matches that are finished with scores and betting contract
        const matchesToResolve = allMatches.filter(match => {
            const json = match.toJSON();
            return (
                json.status === 'FT' &&
                json.score?.home != null &&
                json.score?.away != null &&
                json.bettingContractAddress &&
                String(json.bettingContractAddress).trim() !== ''
            );
        });

        if (matchesToResolve.length === 0) {
            logger.info('No finished matches to resolve on-chain');
            return { matchesProcessed: 0, marketsResolved: 0 };
        }

        logger.info('Found finished matches to resolve', { count: matchesToResolve.length });

        let marketsResolved = 0;

        for (const match of matchesToResolve) {
            const json = match.toJSON();
            try {
                const count = await this.matchResolutionAdapter.resolveMarketsForMatch(
                    json.bettingContractAddress!,
                    json.score!.home!,
                    json.score!.away!
                );
                marketsResolved += count;
                if (count > 0) {
                    logger.info('Match markets resolved', {
                        homeTeam: json.homeTeam.name,
                        awayTeam: json.awayTeam.name,
                        marketsResolved: count
                    });
                }
            } catch (err: any) {
                logger.error('Error resolving match', {
                    matchId: json.id,
                    error: err.message
                });
            }
        }

        logger.info('Finished match resolution process', {
            matchesProcessed: matchesToResolve.length,
            marketsResolved
        });

        return { matchesProcessed: matchesToResolve.length, marketsResolved };
    }
}

import { injectable } from 'tsyringe';
import { StreamWalletIndexer } from './indexers/StreamWalletIndexer';
import { BettingEventIndexer } from './indexers/BettingEventIndexer';
import { logger } from '../logging/logger';

/**
 * Blockchain Event Listener
 * Orchestrates all blockchain event indexers
 */
@injectable()
export class BlockchainEventListener {
    constructor(
        private readonly streamWalletIndexer: StreamWalletIndexer,
        private readonly bettingEventIndexer: BettingEventIndexer
    ) {}

    async start(): Promise<void> {
        logger.info('Starting blockchain event listeners');

        try {
            // Start all indexers
            await Promise.all([
                this.streamWalletIndexer.start(),
                this.bettingEventIndexer.start()
            ]);

            logger.info('All blockchain event listeners started successfully');
        } catch (error) {
            logger.error('Failed to start blockchain event listeners', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }

    stop(): void {
        logger.info('Stopping blockchain event listeners');

        this.streamWalletIndexer.stop();
        this.bettingEventIndexer.stop();

        logger.info('All blockchain event listeners stopped');
    }
}

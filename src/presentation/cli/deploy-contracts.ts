#!/usr/bin/env ts-node
/**
 * CLI Script: Deploy Missing Betting Contracts
 * Deploys contracts for matches without a betting_contract_address
 *
 * Usage: npm run cli:deploy-contracts
 */

import 'reflect-metadata';
import { config } from 'dotenv';
import { setupDependencyInjection, container } from '../../infrastructure/config/di-container';
import { DeployMissingContractsCommand } from './commands/DeployMissingContractsCommand';
import { logger } from '../../infrastructure/logging/logger';

config();
setupDependencyInjection();

async function main() {
    try {
        const command = container.resolve(DeployMissingContractsCommand);
        await command.execute();
        process.exit(0);
    } catch (error) {
        logger.error('Error deploying contracts', { error: error instanceof Error ? error.message : error });
        process.exit(1);
    }
}

main();

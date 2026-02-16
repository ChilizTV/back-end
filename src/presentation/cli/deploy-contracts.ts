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

config();
setupDependencyInjection();

async function main() {
    try {
        const command = container.resolve(DeployMissingContractsCommand);
        await command.execute();
        process.exit(0);
    } catch (error) {
        console.error('💥 Error:', error);
        process.exit(1);
    }
}

main();

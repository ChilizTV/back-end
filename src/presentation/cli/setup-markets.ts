#!/usr/bin/env ts-node
/**
 * CLI Script: Setup Markets for Existing Contracts
 * Configures betting markets for contracts that exist but lack markets
 * Uses Clean Architecture components (DI, Adapters, Repositories)
 *
 * Usage: npx ts-node src/presentation/cli/setup-markets.ts
 */

import 'reflect-metadata';
import { config } from 'dotenv';
import { setupDependencyInjection, container } from '../../infrastructure/config/di-container';
import { SetupMarketsCommand } from './commands/SetupMarketsCommand';

config();
setupDependencyInjection();

async function main() {
    try {
        const command = container.resolve(SetupMarketsCommand);
        await command.execute();
        process.exit(0);
    } catch (error) {
        console.error('💥 Error:', error);
        process.exit(1);
    }
}

main();

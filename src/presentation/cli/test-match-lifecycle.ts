#!/usr/bin/env ts-node
/**
 * CLI Script: Test Match Lifecycle
 * Interactive script to test match creation, status updates, and contract deployment
 *
 * Usage:
 *   npx ts-node src/presentation/cli/test-match-lifecycle.ts           # Interactive menu
 *   npx ts-node src/presentation/cli/test-match-lifecycle.ts create
 *   npx ts-node src/presentation/cli/test-match-lifecycle.ts live [id]
 *   npx ts-node src/presentation/cli/test-match-lifecycle.ts finished [id] <home> <away>
 *   npx ts-node src/presentation/cli/test-match-lifecycle.ts status [id]
 */

import 'reflect-metadata';
import { config } from 'dotenv';
import { setupDependencyInjection, container } from '../../infrastructure/config/di-container';
import { TestMatchLifecycleCommand } from './commands/TestMatchLifecycleCommand';

config();
setupDependencyInjection();

async function main() {
    try {
        const command = container.resolve(TestMatchLifecycleCommand);
        await command.execute(process.argv);
        process.exit(0);
    } catch (error) {
        console.error('💥 Error:', error);
        process.exit(1);
    }
}

main();

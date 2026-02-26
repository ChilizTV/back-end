import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '../../../.env') });

import { supabaseClient } from '../../infrastructure/database/supabase/client';
import { readFileSync } from 'fs';
import { logger } from '../../infrastructure/logging/logger';

async function runMigration() {
  try {
    const migrationPath = process.argv[2];
    if (!migrationPath) {
      logger.error('Usage: npx ts-node src/presentation/cli/run-migration.ts <migration-file-path>');
      process.exit(1);
    }

    logger.info('Reading migration file', { path: migrationPath });
    const sql = readFileSync(migrationPath, 'utf-8');

    logger.info('Executing migration...');
    const { error } = await supabaseClient.rpc('exec_sql', { sql_query: sql });

    if (error) {
      // If exec_sql RPC doesn't exist, try direct execution
      logger.warn('exec_sql RPC not found, trying direct execution');

      // Split by semicolon and execute each statement
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        const { error: execError } = await supabaseClient.rpc('query', { query_string: statement });
        if (execError) {
          logger.error('Migration statement failed', { error: execError.message, statement: statement.substring(0, 100) });
          throw execError;
        }
      }
    }

    logger.info('Migration completed successfully');
  } catch (error) {
    logger.error('Migration failed', { error: error instanceof Error ? error.message : 'Unknown error' });
    process.exit(1);
  }
}

runMigration();

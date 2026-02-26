import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '../../../.env') });

import { createClient } from '@supabase/supabase-js';
import { logger } from '../../infrastructure/logging/logger';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Use service role client for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function migrate() {
  try {
    logger.info('Starting migration to JSONB structure...');

    // The migration SQL statements
    const statements = [
      // Convert home_team to JSONB
      `ALTER TABLE matches
       ALTER COLUMN home_team TYPE JSONB USING
       CASE
         WHEN home_team IS NULL THEN '{"id": 0, "name": "Unknown"}'::jsonb
         WHEN home_team ~ '^{' THEN home_team::jsonb
         ELSE jsonb_build_object('id', 0, 'name', home_team)
       END`,

      // Convert away_team to JSONB
      `ALTER TABLE matches
       ALTER COLUMN away_team TYPE JSONB USING
       CASE
         WHEN away_team IS NULL THEN '{"id": 0, "name": "Unknown"}'::jsonb
         WHEN away_team ~ '^{' THEN away_team::jsonb
         ELSE jsonb_build_object('id', 0, 'name', away_team)
       END`,

      // Convert league to JSONB
      `ALTER TABLE matches
       ALTER COLUMN league TYPE JSONB USING
       CASE
         WHEN league IS NULL THEN '{"id": 0, "name": "Unknown"}'::jsonb
         WHEN league ~ '^{' THEN league::jsonb
         ELSE jsonb_build_object('id', 0, 'name', league)
       END`,

      // Convert season to INTEGER
      `ALTER TABLE matches
       ALTER COLUMN season TYPE INTEGER USING
       CASE
         WHEN season ~ '^\\d+$' THEN season::integer
         ELSE EXTRACT(YEAR FROM NOW())::integer
       END`,

      // Create indexes
      `CREATE INDEX IF NOT EXISTS idx_matches_home_team_name ON matches((home_team->>'name'))`,
      `CREATE INDEX IF NOT EXISTS idx_matches_away_team_name ON matches((away_team->>'name'))`,
      `CREATE INDEX IF NOT EXISTS idx_matches_league_name ON matches((league->>'name'))`,
    ];

    logger.info('Executing migration statements...');

    for (let i = 0; i < statements.length; i++) {
      logger.info(`Executing statement ${i + 1}/${statements.length}...`);

      const { error } = await supabase.rpc('query', { query_string: statements[i] });

      if (error) {
        logger.error('Migration statement failed', {
          error: error.message,
          statement: statements[i].substring(0, 100)
        });
        throw error;
      }
    }

    logger.info('Migration completed successfully!');
    logger.info('Column types updated: home_team, away_team, league → JSONB, season → INTEGER');

  } catch (error) {
    logger.error('Migration failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    logger.info('You can run the migration manually in Supabase SQL Editor using the file:');
    logger.info('server/src/infrastructure/database/migrations/002_update_matches_structure.sql');
    process.exit(1);
  }
}

migrate();

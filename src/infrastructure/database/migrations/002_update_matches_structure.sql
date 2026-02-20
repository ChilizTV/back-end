-- =====================================================
-- Update matches table structure for JSONB columns
-- =====================================================

-- Step 1: Drop ALL views that depend on these columns
DROP VIEW IF EXISTS active_matches;
DROP VIEW IF EXISTS match_stats;
DROP VIEW IF EXISTS pending_settlement_predictions;

-- Step 2: Change home_team, away_team, and league to JSONB to store structured data
ALTER TABLE matches
ALTER COLUMN home_team TYPE JSONB USING
  CASE
    WHEN home_team IS NULL THEN '{"id": 0, "name": "Unknown"}'::jsonb
    WHEN home_team ~ '^{' THEN home_team::jsonb
    ELSE jsonb_build_object('id', 0, 'name', home_team)
  END;

ALTER TABLE matches
ALTER COLUMN away_team TYPE JSONB USING
  CASE
    WHEN away_team IS NULL THEN '{"id": 0, "name": "Unknown"}'::jsonb
    WHEN away_team ~ '^{' THEN away_team::jsonb
    ELSE jsonb_build_object('id', 0, 'name', away_team)
  END;

ALTER TABLE matches
ALTER COLUMN league TYPE JSONB USING
  CASE
    WHEN league IS NULL THEN '{"id": 0, "name": "Unknown"}'::jsonb
    WHEN league ~ '^{' THEN league::jsonb
    ELSE jsonb_build_object('id', 0, 'name', league)
  END;

-- Change season to INTEGER for consistency
ALTER TABLE matches
ALTER COLUMN season TYPE INTEGER USING
  CASE
    WHEN season ~ '^\d+$' THEN season::integer
    ELSE EXTRACT(YEAR FROM NOW())::integer
  END;

-- Step 3: Create indexes for JSONB queries
CREATE INDEX IF NOT EXISTS idx_matches_home_team_name ON matches((home_team->>'name'));
CREATE INDEX IF NOT EXISTS idx_matches_away_team_name ON matches((away_team->>'name'));
CREATE INDEX IF NOT EXISTS idx_matches_league_name ON matches((league->>'name'));

-- Step 4: Recreate views with JSONB structure
CREATE OR REPLACE VIEW active_matches AS
SELECT
    id,
    api_football_id,
    home_team->>'name' as home_team,
    away_team->>'name' as away_team,
    league->>'name' as league,
    season,
    status,
    match_date,
    venue,
    home_score,
    away_score,
    odds,
    betting_contract_address,
    created_at,
    updated_at
FROM matches
WHERE match_date BETWEEN NOW() - INTERVAL '24 hours' AND NOW() + INTERVAL '24 hours'
ORDER BY match_date ASC;

CREATE OR REPLACE VIEW match_stats AS
SELECT
    m.api_football_id,
    m.home_team->>'name' as home_team,
    m.away_team->>'name' as away_team,
    m.match_date,
    m.status,
    COUNT(DISTINCT cm.id) as message_count,
    COUNT(DISTINCT cu.user_id) as connected_users_count
FROM matches m
LEFT JOIN chat_messages cm ON m.api_football_id = cm.match_id
LEFT JOIN chat_connected_users cu ON m.api_football_id = cu.match_id
GROUP BY m.api_football_id, m.home_team, m.away_team, m.match_date, m.status;

CREATE OR REPLACE VIEW pending_settlement_predictions AS
SELECT
    p.*,
    m.home_team,
    m.away_team,
    m.home_score,
    m.away_score,
    m.status as match_status
FROM predictions p
JOIN matches m ON p.match_id = m.api_football_id
WHERE p.status IN ('PENDING', 'IN_PROGRESS')
AND m.status = 'FT'
AND m.home_score IS NOT NULL
AND m.away_score IS NOT NULL;

-- Step 5: Add comments
COMMENT ON COLUMN matches.home_team IS 'Home team as JSONB: {id, name, logo}';
COMMENT ON COLUMN matches.away_team IS 'Away team as JSONB: {id, name, logo}';
COMMENT ON COLUMN matches.league IS 'League as JSONB: {id, name, logo, country}';
COMMENT ON VIEW active_matches IS 'Matches within 24 hours (past and future) with flattened JSONB fields';
COMMENT ON VIEW match_stats IS 'Statistics for matches with flattened JSONB fields';
COMMENT ON VIEW pending_settlement_predictions IS 'Predictions ready to be settled based on match results';

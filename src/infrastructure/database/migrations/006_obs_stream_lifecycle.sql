-- Migration 006: OBS Stream Lifecycle
-- Extends live_streams to support a 3-state lifecycle (created → live → ended)
-- and adds last_heartbeat_at for stale stream detection.

-- 1. Drop old status check constraint ('active' | 'ended')
ALTER TABLE live_streams DROP CONSTRAINT IF EXISTS live_streams_status_check;

-- 2. Add new check constraint ('created' | 'live' | 'ended')
ALTER TABLE live_streams
  ADD CONSTRAINT live_streams_status_check
  CHECK (status IN ('created', 'live', 'ended'));

-- 3. Add heartbeat column (nullable — set when stream first goes LIVE)
ALTER TABLE live_streams
  ADD COLUMN IF NOT EXISTS last_heartbeat_at TIMESTAMPTZ;

-- 4. Composite index for the stale-stream cron query:
--    WHERE status = 'live' AND last_heartbeat_at < $threshold
CREATE INDEX IF NOT EXISTS idx_live_streams_heartbeat
  ON live_streams (status, last_heartbeat_at);

-- 5. Migrate existing rows: 'active' → 'live'
UPDATE live_streams SET status = 'live' WHERE status = 'active';

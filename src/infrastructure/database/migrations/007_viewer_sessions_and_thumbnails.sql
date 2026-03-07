-- Migration 007: viewer_sessions table + thumbnail_url column
-- Run manually via Supabase SQL editor or psql

-- ── Viewer sessions ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS viewer_sessions (
  id                UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  stream_id         UUID        NOT NULL REFERENCES live_streams(id) ON DELETE CASCADE,
  session_token     TEXT        NOT NULL UNIQUE,
  last_heartbeat_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Composite index used by cron cleanup: stream_id + heartbeat age
CREATE INDEX IF NOT EXISTS idx_viewer_sessions_stream
  ON viewer_sessions (stream_id, last_heartbeat_at);

-- Enable Supabase Realtime change detection on viewer_sessions
ALTER TABLE viewer_sessions REPLICA IDENTITY FULL;

-- ── Thumbnails ────────────────────────────────────────────────────────────────
ALTER TABLE live_streams ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

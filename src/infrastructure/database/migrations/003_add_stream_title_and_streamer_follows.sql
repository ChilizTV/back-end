-- =====================================================
-- MIGRATION 001 — Stream Title + Streamer Follows
-- =====================================================

-- =====================================================
-- 1. Add title column to live_streams
-- =====================================================

ALTER TABLE live_streams
  ADD COLUMN IF NOT EXISTS title TEXT;

COMMENT ON COLUMN live_streams.title IS 'Optional title set by the streamer before going live';

-- =====================================================
-- 2. Create streamer_follows table
-- =====================================================

CREATE TABLE IF NOT EXISTS streamer_follows (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    follower_id TEXT NOT NULL,
    streamer_id TEXT NOT NULL,
    streamer_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Prevent duplicate follows
    CONSTRAINT uq_streamer_follows UNIQUE (follower_id, streamer_id)
);

-- =====================================================
-- 3. Indexes
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_streamer_follows_follower_id
    ON streamer_follows(follower_id);

CREATE INDEX IF NOT EXISTS idx_streamer_follows_streamer_id
    ON streamer_follows(streamer_id);

CREATE INDEX IF NOT EXISTS idx_streamer_follows_created_at
    ON streamer_follows(created_at DESC);

-- =====================================================
-- 4. Row Level Security
-- =====================================================

ALTER TABLE streamer_follows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view follows" ON streamer_follows;
DROP POLICY IF EXISTS "Anyone can follow" ON streamer_follows;
DROP POLICY IF EXISTS "Anyone can unfollow" ON streamer_follows;

CREATE POLICY "Anyone can view follows" ON streamer_follows
    FOR SELECT
    TO public, anon, authenticated
    USING (true);

CREATE POLICY "Anyone can follow" ON streamer_follows
    FOR INSERT
    TO public, anon, authenticated
    WITH CHECK (true);

CREATE POLICY "Anyone can unfollow" ON streamer_follows
    FOR DELETE
    TO public, anon, authenticated
    USING (true);

-- =====================================================
-- 5. Grants
-- =====================================================

GRANT SELECT, INSERT, DELETE ON streamer_follows TO authenticated;
GRANT SELECT, INSERT, DELETE ON streamer_follows TO anon;
GRANT SELECT, INSERT, DELETE ON streamer_follows TO public;

-- =====================================================
-- 6. Comments
-- =====================================================

COMMENT ON TABLE streamer_follows IS 'Tracks which users follow which streamers (Dynamic Labs user IDs)';
COMMENT ON COLUMN streamer_follows.follower_id IS 'Dynamic Labs userId of the follower';
COMMENT ON COLUMN streamer_follows.streamer_id IS 'Dynamic Labs userId of the streamer being followed';
COMMENT ON COLUMN streamer_follows.streamer_name IS 'Denormalized streamer username for display without join';
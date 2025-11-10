-- =====================================================
-- LIVE STREAMS TABLE
-- =====================================================

-- Create live_streams table for HLS streaming
CREATE TABLE IF NOT EXISTS live_streams (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    match_id INTEGER NOT NULL,
    streamer_id TEXT NOT NULL,
    streamer_name TEXT NOT NULL,
    stream_key TEXT UNIQUE NOT NULL,
    hls_playlist_url TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'ended')),
    viewer_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    
    -- Foreign key constraint
    CONSTRAINT fk_live_streams_match_id 
        FOREIGN KEY (match_id) 
        REFERENCES matches(api_football_id) 
        ON DELETE CASCADE
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_live_streams_match_id ON live_streams(match_id);
CREATE INDEX IF NOT EXISTS idx_live_streams_stream_key ON live_streams(stream_key);
CREATE INDEX IF NOT EXISTS idx_live_streams_status ON live_streams(status);
CREATE INDEX IF NOT EXISTS idx_live_streams_created_at ON live_streams(created_at DESC);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable Row Level Security
ALTER TABLE live_streams ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for re-running the script)
DROP POLICY IF EXISTS "Anyone can view active streams" ON live_streams;
DROP POLICY IF EXISTS "Public can create streams" ON live_streams;
DROP POLICY IF EXISTS "Anyone can update streams" ON live_streams;
DROP POLICY IF EXISTS "Anyone can delete streams" ON live_streams;

-- Allow anyone to read active streams
CREATE POLICY "Anyone can view active streams" ON live_streams
    FOR SELECT
    TO public, anon, authenticated
    USING (status = 'active');

-- Allow public/authenticated users to create streams
CREATE POLICY "Public can create streams" ON live_streams
    FOR INSERT
    TO public, anon, authenticated
    WITH CHECK (true);

-- Allow updates (service role or authenticated users)
CREATE POLICY "Anyone can update streams" ON live_streams
    FOR UPDATE
    TO public, anon, authenticated
    USING (true);

-- Allow deletes (service role or authenticated users)
CREATE POLICY "Anyone can delete streams" ON live_streams
    FOR DELETE
    TO public, anon, authenticated
    USING (true);

-- =====================================================
-- GRANTS
-- =====================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON live_streams TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON live_streams TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON live_streams TO public;

-- =====================================================
-- REAL-TIME CONFIGURATION
-- =====================================================

-- Enable real-time subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE live_streams;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE live_streams IS 'Live video streams for matches with HLS playlist URLs';


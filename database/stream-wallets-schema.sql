-- =====================================================
-- STREAM WALLETS TABLE
-- =====================================================

-- Create stream_wallets table for tracking deployed wallets
CREATE TABLE IF NOT EXISTS stream_wallets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    streamer_address TEXT NOT NULL UNIQUE,
    wallet_address TEXT NOT NULL UNIQUE,
    transaction_hash TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_stream_wallets_streamer ON stream_wallets(streamer_address);
CREATE INDEX IF NOT EXISTS idx_stream_wallets_wallet ON stream_wallets(wallet_address);
CREATE INDEX IF NOT EXISTS idx_stream_wallets_tx_hash ON stream_wallets(transaction_hash);
CREATE INDEX IF NOT EXISTS idx_stream_wallets_created_at ON stream_wallets(created_at DESC);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE stream_wallets ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view stream wallets" ON stream_wallets;
DROP POLICY IF EXISTS "Anyone can insert stream wallets" ON stream_wallets;

-- Allow anyone to view wallets
CREATE POLICY "Anyone can view stream wallets" ON stream_wallets
    FOR SELECT
    TO public, anon, authenticated
    USING (true);

-- Allow service role to insert wallets (from indexer)
CREATE POLICY "Anyone can insert stream wallets" ON stream_wallets
    FOR INSERT
    TO public, anon, authenticated
    WITH CHECK (true);

-- =====================================================
-- GRANTS
-- =====================================================

GRANT SELECT, INSERT ON stream_wallets TO authenticated;
GRANT SELECT, INSERT ON stream_wallets TO anon;
GRANT SELECT, INSERT ON stream_wallets TO public;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE stream_wallets IS 'Deployed StreamWallet contracts for streamers';
COMMENT ON COLUMN stream_wallets.streamer_address IS 'Address of the streamer';
COMMENT ON COLUMN stream_wallets.wallet_address IS 'Address of the deployed StreamWallet contract';

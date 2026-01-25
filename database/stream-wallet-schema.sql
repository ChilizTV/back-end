-- =====================================================
-- STREAM WALLET DONATIONS TABLE
-- =====================================================

-- Create donations table for tracking donations to streamers
CREATE TABLE IF NOT EXISTS donations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    streamer_address TEXT NOT NULL,
    donor_address TEXT NOT NULL,
    stream_wallet_address TEXT NOT NULL,
    amount DECIMAL(20, 8) NOT NULL,
    message TEXT,
    transaction_hash TEXT NOT NULL UNIQUE,
    platform_fee DECIMAL(20, 8) NOT NULL,
    streamer_amount DECIMAL(20, 8) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- STREAM WALLET SUBSCRIPTIONS TABLE
-- =====================================================

-- Create subscriptions table for tracking subscriptions to streamers
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    streamer_address TEXT NOT NULL,
    subscriber_address TEXT NOT NULL,
    stream_wallet_address TEXT NOT NULL,
    amount DECIMAL(20, 8) NOT NULL,
    duration_seconds INTEGER NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    expiry_time TIMESTAMP WITH TIME ZONE NOT NULL,
    transaction_hash TEXT NOT NULL UNIQUE,
    platform_fee DECIMAL(20, 8) NOT NULL,
    streamer_amount DECIMAL(20, 8) NOT NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Donations indexes
CREATE INDEX IF NOT EXISTS idx_donations_streamer ON donations(streamer_address);
CREATE INDEX IF NOT EXISTS idx_donations_donor ON donations(donor_address);
CREATE INDEX IF NOT EXISTS idx_donations_created_at ON donations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_donations_tx_hash ON donations(transaction_hash);

-- Subscriptions indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_streamer ON subscriptions(streamer_address);
CREATE INDEX IF NOT EXISTS idx_subscriptions_subscriber ON subscriptions(subscriber_address);
CREATE INDEX IF NOT EXISTS idx_subscriptions_expiry ON subscriptions(expiry_time);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_tx_hash ON subscriptions(transaction_hash);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable Row Level Security
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for re-running the script)
DROP POLICY IF EXISTS "Anyone can view donations" ON donations;
DROP POLICY IF EXISTS "Anyone can insert donations" ON donations;
DROP POLICY IF EXISTS "Anyone can view subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Anyone can insert subscriptions" ON subscriptions;

-- Allow anyone to view donations
CREATE POLICY "Anyone can view donations" ON donations
    FOR SELECT
    TO public, anon, authenticated
    USING (true);

-- Allow service role to insert donations (from indexer)
CREATE POLICY "Anyone can insert donations" ON donations
    FOR INSERT
    TO public, anon, authenticated
    WITH CHECK (true);

-- Allow anyone to view subscriptions
CREATE POLICY "Anyone can view subscriptions" ON subscriptions
    FOR SELECT
    TO public, anon, authenticated
    USING (true);

-- Allow service role to insert subscriptions (from indexer)
CREATE POLICY "Anyone can insert subscriptions" ON subscriptions
    FOR INSERT
    TO public, anon, authenticated
    WITH CHECK (true);

-- Allow updates for status changes
CREATE POLICY "Anyone can update subscriptions" ON subscriptions
    FOR UPDATE
    TO public, anon, authenticated
    USING (true);

-- =====================================================
-- GRANTS
-- =====================================================

GRANT SELECT, INSERT ON donations TO authenticated;
GRANT SELECT, INSERT ON donations TO anon;
GRANT SELECT, INSERT ON donations TO public;

GRANT SELECT, INSERT, UPDATE ON subscriptions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON subscriptions TO anon;
GRANT SELECT, INSERT, UPDATE ON subscriptions TO public;

-- =====================================================
-- REAL-TIME CONFIGURATION
-- =====================================================

-- Enable real-time subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE donations;
ALTER PUBLICATION supabase_realtime ADD TABLE subscriptions;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE donations IS 'Donations to streamers via StreamWallet smart contract';
COMMENT ON TABLE subscriptions IS 'Subscriptions to streamers via StreamWallet smart contract';
COMMENT ON COLUMN donations.platform_fee IS 'Platform fee deducted from donation';
COMMENT ON COLUMN donations.streamer_amount IS 'Amount received by streamer after fee';
COMMENT ON COLUMN subscriptions.status IS 'Subscription status: active, expired, or cancelled';

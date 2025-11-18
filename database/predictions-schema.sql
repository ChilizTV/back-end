-- =====================================================
-- PREDICTIONS TABLE SCHEMA
-- =====================================================

-- Table for storing user predictions/bets
CREATE TABLE IF NOT EXISTS predictions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    wallet_address TEXT NOT NULL,
    username TEXT NOT NULL,
    match_id INTEGER NOT NULL,
    match_name TEXT NOT NULL,
    prediction_type TEXT NOT NULL,
    prediction_value TEXT NOT NULL,
    predicted_team TEXT NOT NULL,
    odds DECIMAL(5,2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_PROGRESS', 'WON', 'LOST', 'CANCELLED')),
    actual_result TEXT,
    transaction_hash TEXT NOT NULL,
    placed_at TIMESTAMP WITH TIME ZONE NOT NULL,
    match_start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    settled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_predictions_user_id ON predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_predictions_wallet_address ON predictions(wallet_address);
CREATE INDEX IF NOT EXISTS idx_predictions_match_id ON predictions(match_id);
CREATE INDEX IF NOT EXISTS idx_predictions_status ON predictions(status);
CREATE INDEX IF NOT EXISTS idx_predictions_placed_at ON predictions(placed_at DESC);
CREATE INDEX IF NOT EXISTS idx_predictions_user_wallet ON predictions(user_id, wallet_address);

-- =====================================================
-- FOREIGN KEY CONSTRAINTS
-- =====================================================

-- Link predictions to matches
ALTER TABLE predictions 
ADD CONSTRAINT fk_predictions_match_id 
FOREIGN KEY (match_id) REFERENCES matches(api_football_id) 
ON DELETE CASCADE;

-- =====================================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================================

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_predictions_updated_at 
    BEFORE UPDATE ON predictions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- REAL-TIME CONFIGURATION
-- =====================================================

-- Enable real-time for predictions table
ALTER PUBLICATION supabase_realtime ADD TABLE predictions;

-- =====================================================
-- VIEWS FOR COMMON QUERIES
-- =====================================================

-- View for user prediction statistics
CREATE OR REPLACE VIEW user_prediction_stats AS
SELECT 
    user_id,
    wallet_address,
    COUNT(*) as total_predictions,
    COUNT(CASE WHEN status = 'WON' THEN 1 END) as total_wins,
    COUNT(CASE WHEN status = 'LOST' THEN 1 END) as total_losses,
    COUNT(CASE WHEN status IN ('PENDING', 'IN_PROGRESS') THEN 1 END) as active_predictions,
    CASE 
        WHEN COUNT(CASE WHEN status IN ('WON', 'LOST') THEN 1 END) > 0 
        THEN ROUND((COUNT(CASE WHEN status = 'WON' THEN 1 END)::DECIMAL / COUNT(CASE WHEN status IN ('WON', 'LOST') THEN 1 END)::DECIMAL) * 100, 2)
        ELSE 0 
    END as win_rate
FROM predictions
GROUP BY user_id, wallet_address;

-- View for pending predictions that need settlement
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

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE predictions IS 'User predictions/bets on football matches';
COMMENT ON VIEW user_prediction_stats IS 'Aggregated statistics for user predictions';
COMMENT ON VIEW pending_settlement_predictions IS 'Predictions ready to be settled based on match results';


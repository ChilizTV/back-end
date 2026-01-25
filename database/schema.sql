-- =====================================================
-- CHILIZ FOOTBALL DATABASE SCHEMA
-- =====================================================

-- =====================================================
-- MATCHES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS matches (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    api_football_id INTEGER UNIQUE NOT NULL,
    home_team TEXT NOT NULL,
    away_team TEXT NOT NULL,
    home_score INTEGER,
    away_score INTEGER,
    match_date TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL DEFAULT 'scheduled',
    league TEXT NOT NULL,
    season TEXT NOT NULL,
    venue TEXT,
    referee TEXT,
    odds JSONB,
    betting_contract_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- MIGRATION: Add betting_contract_address column
-- Add betting_contract_address column if it doesn't exist (for existing databases)
ALTER TABLE matches 
ADD COLUMN IF NOT EXISTS betting_contract_address TEXT;

-- =====================================================
-- CHAT MESSAGES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    match_id INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    wallet_address TEXT NOT NULL,
    username TEXT NOT NULL,
    message TEXT NOT NULL,
    message_type TEXT NOT NULL CHECK (message_type IN ('message', 'bet', 'system')),
    is_featured BOOLEAN DEFAULT false,
    bet_type TEXT,
    bet_sub_type TEXT,
    amount DECIMAL(10,2),
    odds DECIMAL(5,2),
    system_type TEXT,
    system_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- CONNECTED USERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS chat_connected_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    match_id INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    username TEXT NOT NULL,
    connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(match_id, user_id)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Matches indexes
CREATE INDEX IF NOT EXISTS idx_matches_api_football_id ON matches(api_football_id);
CREATE INDEX IF NOT EXISTS idx_matches_match_date ON matches(match_date);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_league ON matches(league);
CREATE INDEX IF NOT EXISTS idx_matches_betting_contract ON matches(betting_contract_address);

-- Chat messages indexes
CREATE INDEX IF NOT EXISTS idx_chat_messages_match_id ON chat_messages(match_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_message_type ON chat_messages(message_type);

-- Connected users indexes
CREATE INDEX IF NOT EXISTS idx_chat_connected_users_match_id ON chat_connected_users(match_id);
CREATE INDEX IF NOT EXISTS idx_chat_connected_users_user_id ON chat_connected_users(user_id);

-- =====================================================
-- FOREIGN KEY CONSTRAINTS
-- =====================================================

-- Link chat messages to matches
ALTER TABLE chat_messages 
ADD CONSTRAINT fk_chat_messages_match_id 
FOREIGN KEY (match_id) REFERENCES matches(api_football_id) 
ON DELETE CASCADE;

-- Link connected users to matches
ALTER TABLE chat_connected_users 
ADD CONSTRAINT fk_chat_connected_users_match_id 
FOREIGN KEY (match_id) REFERENCES matches(api_football_id) 
ON DELETE CASCADE;

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_connected_users ENABLE ROW LEVEL SECURITY;

-- Matches policies
CREATE POLICY "Allow read access to matches" ON matches
    FOR SELECT USING (true);

CREATE POLICY "Allow insert/update access to matches" ON matches
    FOR ALL USING (true);

-- Chat messages policies
CREATE POLICY "Allow read access to chat messages" ON chat_messages
    FOR SELECT USING (true);

CREATE POLICY "Allow insert access to chat messages" ON chat_messages
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update access to chat messages" ON chat_messages
    FOR UPDATE USING (true);

-- Connected users policies
CREATE POLICY "Allow read access to connected users" ON chat_connected_users
    FOR SELECT USING (true);

CREATE POLICY "Allow insert/update access to connected users" ON chat_connected_users
    FOR ALL USING (true);

-- =====================================================
-- REAL-TIME CONFIGURATION
-- =====================================================

-- Enable real-time for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE matches;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_connected_users;

-- =====================================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_matches_updated_at 
    BEFORE UPDATE ON matches 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_messages_updated_at 
    BEFORE UPDATE ON chat_messages 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- CLEANUP FUNCTION
-- =====================================================

-- Function to clean up old matches and their related data
CREATE OR REPLACE FUNCTION cleanup_old_matches()
RETURNS void AS $$
BEGIN
    -- Delete chat messages for old matches (older than 24 hours after match date)
    DELETE FROM chat_messages 
    WHERE match_id IN (
        SELECT api_football_id 
        FROM matches 
        WHERE match_date < NOW() - INTERVAL '24 hours'
    );
    
    -- Delete connected users for old matches
    DELETE FROM chat_connected_users 
    WHERE match_id IN (
        SELECT api_football_id 
        FROM matches 
        WHERE match_date < NOW() - INTERVAL '24 hours'
    );
    
    -- Delete old matches
    DELETE FROM matches 
    WHERE match_date < NOW() - INTERVAL '24 hours';
    
    RAISE NOTICE 'Cleaned up old matches and related data';
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- VIEWS FOR COMMON QUERIES
-- =====================================================

-- View for active matches (next 24 hours)
CREATE OR REPLACE VIEW active_matches AS
SELECT * FROM matches 
WHERE match_date BETWEEN NOW() - INTERVAL '24 hours' AND NOW() + INTERVAL '24 hours'
ORDER BY match_date ASC;

-- View for match statistics
CREATE OR REPLACE VIEW match_stats AS
SELECT 
    m.api_football_id,
    m.home_team,
    m.away_team,
    m.match_date,
    m.status,
    COUNT(DISTINCT cm.id) as message_count,
    COUNT(DISTINCT cu.user_id) as connected_users_count
FROM matches m
LEFT JOIN chat_messages cm ON m.api_football_id = cm.match_id
LEFT JOIN chat_connected_users cu ON m.api_football_id = cu.match_id
GROUP BY m.api_football_id, m.home_team, m.away_team, m.match_date, m.status;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE matches IS 'Football matches from API-Football with odds';
COMMENT ON TABLE chat_messages IS 'Real-time chat messages for matches';
COMMENT ON TABLE chat_connected_users IS 'Users currently connected to match chat rooms';
COMMENT ON FUNCTION cleanup_old_matches() IS 'Clean up old matches and related data';
COMMENT ON VIEW active_matches IS 'Matches within 24 hours (past and future)';
COMMENT ON VIEW match_stats IS 'Statistics for matches including message and user counts'; 
-- =====================================================
-- WAITLIST TABLE SCHEMA
-- =====================================================

CREATE TABLE IF NOT EXISTS waitlist (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    wallet_address TEXT,
    source TEXT,
    is_whitelisted BOOLEAN NOT NULL DEFAULT FALSE,
    registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    whitelisted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger function to update updated_at
CREATE OR REPLACE FUNCTION update_waitlist_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_waitlist_updated_at ON waitlist;
CREATE TRIGGER trg_waitlist_updated_at
    BEFORE UPDATE ON waitlist
    FOR EACH ROW
    EXECUTE FUNCTION update_waitlist_updated_at();

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_waitlist_email ON waitlist(email);
CREATE INDEX IF NOT EXISTS idx_waitlist_wallet_address ON waitlist(wallet_address);
CREATE INDEX IF NOT EXISTS idx_waitlist_is_whitelisted ON waitlist(is_whitelisted);

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE waitlist IS 'User waitlist for gated access';
COMMENT ON COLUMN waitlist.source IS 'Acquisition source (twitter, friend, etc.)';
COMMENT ON COLUMN waitlist.is_whitelisted IS 'Indicates if the user can bypass waitlist';


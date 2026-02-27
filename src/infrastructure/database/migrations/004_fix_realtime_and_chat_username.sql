-- Fix realtime filter for service_role inserts
-- Supabase Realtime requires REPLICA IDENTITY FULL for filters on non-PK columns
ALTER TABLE chat_messages REPLICA IDENTITY FULL;

-- Add wallet_address to chat_connected_users for username lookup
ALTER TABLE chat_connected_users ADD COLUMN IF NOT EXISTS wallet_address TEXT;
CREATE INDEX IF NOT EXISTS idx_chat_connected_users_wallet ON chat_connected_users(wallet_address);

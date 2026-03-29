-- ===========================================================
-- MIGRATION 010 — Production RLS
-- Apply in Supabase SQL Editor (copy-paste the full script)
-- Prerequisites: SUPABASE_SERVICE_ROLE_KEY must be set in
-- the backend .env — service_role bypasses RLS entirely.
-- ===========================================================


-- ==========================================
-- TABLE: matches
-- ==========================================

DROP POLICY IF EXISTS "Allow read access to matches" ON matches;
DROP POLICY IF EXISTS "Allow read" ON matches;
DROP POLICY IF EXISTS "Allow insert/update access to matches" ON matches;
DROP POLICY IF EXISTS "Allow insert/update" ON matches;

ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_select_matches"
ON matches
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "block_anon_insert_matches"
ON matches
FOR INSERT
TO anon, authenticated
WITH CHECK (false);

CREATE POLICY "block_anon_update_matches"
ON matches
FOR UPDATE
TO anon, authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY "block_anon_delete_matches"
ON matches
FOR DELETE
TO anon, authenticated
USING (false);


-- ==========================================
-- TABLE: chat_messages
-- ==========================================

DROP POLICY IF EXISTS "Allow read access" ON chat_messages;
DROP POLICY IF EXISTS "Allow read access to chat messages" ON chat_messages;
DROP POLICY IF EXISTS "Allow insert access" ON chat_messages;
DROP POLICY IF EXISTS "Allow insert access to chat messages" ON chat_messages;
DROP POLICY IF EXISTS "Allow update access" ON chat_messages;
DROP POLICY IF EXISTS "Allow update access to chat messages" ON chat_messages;

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_select_chat_messages"
ON chat_messages
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "anon_insert_chat_messages"
ON chat_messages
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- No UPDATE policy — messages are immutable from the client
-- No DELETE policy — handled by backend service_role only


-- ==========================================
-- TABLE: chat_connected_users
-- ==========================================

DROP POLICY IF EXISTS "Allow read access to connected users" ON chat_connected_users;
DROP POLICY IF EXISTS "Allow insert/update access to connected users" ON chat_connected_users;

ALTER TABLE chat_connected_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_select_chat_connected_users"
ON chat_connected_users
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "anon_insert_chat_connected_users"
ON chat_connected_users
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "anon_update_chat_connected_users"
ON chat_connected_users
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "anon_delete_chat_connected_users"
ON chat_connected_users
FOR DELETE
TO anon, authenticated
USING (true);


-- ==========================================
-- TABLE: live_streams
-- ==========================================

ALTER TABLE live_streams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_select_live_streams"
ON live_streams
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "block_anon_insert_live_streams"
ON live_streams
FOR INSERT
TO anon, authenticated
WITH CHECK (false);

CREATE POLICY "block_anon_update_live_streams"
ON live_streams
FOR UPDATE
TO anon, authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY "block_anon_delete_live_streams"
ON live_streams
FOR DELETE
TO anon, authenticated
USING (false);


-- ==========================================
-- TABLE: predictions
-- ==========================================

ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_select_predictions"
ON predictions
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "block_anon_insert_predictions"
ON predictions
FOR INSERT
TO anon, authenticated
WITH CHECK (false);

CREATE POLICY "block_anon_update_predictions"
ON predictions
FOR UPDATE
TO anon, authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY "block_anon_delete_predictions"
ON predictions
FOR DELETE
TO anon, authenticated
USING (false);


-- ==========================================
-- TABLE: donations
-- ==========================================

DROP POLICY IF EXISTS "Anyone can insert" ON donations;
DROP POLICY IF EXISTS "Anyone can view" ON donations;

ALTER TABLE donations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_select_donations"
ON donations
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "block_anon_insert_donations"
ON donations
FOR INSERT
TO anon, authenticated
WITH CHECK (false);

CREATE POLICY "block_anon_update_donations"
ON donations
FOR UPDATE
TO anon, authenticated
USING (false)
WITH CHECK (false);


-- ==========================================
-- TABLE: subscriptions
-- ==========================================

DROP POLICY IF EXISTS "Anyone can insert" ON subscriptions;
DROP POLICY IF EXISTS "Anyone can update" ON subscriptions;
DROP POLICY IF EXISTS "Anyone can view" ON subscriptions;

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_select_subscriptions"
ON subscriptions
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "block_anon_insert_subscriptions"
ON subscriptions
FOR INSERT
TO anon, authenticated
WITH CHECK (false);

CREATE POLICY "block_anon_update_subscriptions"
ON subscriptions
FOR UPDATE
TO anon, authenticated
USING (false)
WITH CHECK (false);


-- ==========================================
-- TABLE: stream_wallets
-- ==========================================

DROP POLICY IF EXISTS "Anyone can view stream wallets" ON stream_wallets;
DROP POLICY IF EXISTS "Anyone can insert stream wallets" ON stream_wallets;

ALTER TABLE stream_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_select_stream_wallets"
ON stream_wallets
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "block_anon_insert_stream_wallets"
ON stream_wallets
FOR INSERT
TO anon, authenticated
WITH CHECK (false);

CREATE POLICY "block_anon_update_stream_wallets"
ON stream_wallets
FOR UPDATE
TO anon, authenticated
USING (false)
WITH CHECK (false);


-- ==========================================
-- TABLE: streamer_follows
-- ==========================================

DROP POLICY IF EXISTS "Anyone can view follows" ON streamer_follows;
DROP POLICY IF EXISTS "Anyone can follow" ON streamer_follows;
DROP POLICY IF EXISTS "Anyone can unfollow" ON streamer_follows;

ALTER TABLE streamer_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_select_streamer_follows"
ON streamer_follows
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "block_anon_insert_streamer_follows"
ON streamer_follows
FOR INSERT
TO anon, authenticated
WITH CHECK (false);

CREATE POLICY "block_anon_delete_streamer_follows"
ON streamer_follows
FOR DELETE
TO anon, authenticated
USING (false);


-- ==========================================
-- TABLE: viewer_sessions
-- ==========================================

ALTER TABLE viewer_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "block_anon_all_viewer_sessions"
ON viewer_sessions
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);


-- ==========================================
-- TABLE: waitlist
-- ==========================================

ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "block_anon_all_waitlist"
ON waitlist
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);


-- ==========================================
-- STORAGE: stream-thumbnails bucket
-- ==========================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'stream-thumbnails',
  'stream-thumbnails',
  true,
  512000,
  ARRAY['image/jpeg']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 512000,
  allowed_mime_types = ARRAY['image/jpeg'];

DROP POLICY IF EXISTS "block_anon_upload_stream_thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "block_anon_update_stream_thumbnails" ON storage.objects;

CREATE POLICY "block_anon_upload_stream_thumbnails"
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'stream-thumbnails' AND false);

CREATE POLICY "block_anon_update_stream_thumbnails"
ON storage.objects
FOR UPDATE
TO anon, authenticated
USING (bucket_id = 'stream-thumbnails' AND false)
WITH CHECK (bucket_id = 'stream-thumbnails' AND false);

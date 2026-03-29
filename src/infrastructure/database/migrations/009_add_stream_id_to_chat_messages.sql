-- Migration 009: Multi-room chat — add stream_id to chat_messages
-- stream_id IS NULL  → message du chat général du match
-- stream_id = X      → message du chat spécifique au stream X

ALTER TABLE chat_messages
ADD COLUMN IF NOT EXISTS stream_id UUID REFERENCES live_streams(id) ON DELETE SET NULL;

-- Index pour requêtes par stream
CREATE INDEX IF NOT EXISTS idx_chat_messages_stream_id ON chat_messages(stream_id);

-- Index partiel pour les requêtes "chat général" (stream_id IS NULL)
CREATE INDEX IF NOT EXISTS idx_chat_messages_match_only ON chat_messages(match_id)
WHERE stream_id IS NULL;

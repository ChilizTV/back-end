-- Migration 005: Extend active_matches view to match the new 7-day fetch window
-- The application queries the matches table directly; this view is for documentation
-- and tooling consistency only.

CREATE OR REPLACE VIEW active_matches AS
SELECT * FROM matches
WHERE match_date BETWEEN NOW() - INTERVAL '24 hours' AND NOW() + INTERVAL '7 days'
ORDER BY match_date ASC;

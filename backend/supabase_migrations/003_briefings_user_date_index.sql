-- Index for efficient per-user briefing lookups (latest, history, get-by-date).
-- Uniqueness is already enforced by briefings_date_user_key (date, user_id).
CREATE INDEX IF NOT EXISTS briefings_user_date_idx ON briefings (user_id, date DESC);

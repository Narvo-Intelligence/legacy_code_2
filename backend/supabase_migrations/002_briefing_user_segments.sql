-- Briefing: user_id for personalized briefings, story_segments for chapter markers
-- Run in Supabase SQL Editor after main schema.

-- Add columns (idempotent)
ALTER TABLE briefings ADD COLUMN IF NOT EXISTS user_id text DEFAULT '';
ALTER TABLE briefings ADD COLUMN IF NOT EXISTS story_segments jsonb DEFAULT '[]';

-- Ensure existing rows have user_id = '' for global default
UPDATE briefings SET user_id = '' WHERE user_id IS NULL;

-- One briefing per (date, user_id). Global = user_id ''.
-- Drop old unique on date; add unique on (date, user_id)
ALTER TABLE briefings DROP CONSTRAINT IF EXISTS briefings_date_key;
ALTER TABLE briefings ADD CONSTRAINT briefings_date_user_key UNIQUE (date, user_id);

COMMENT ON COLUMN briefings.user_id IS 'Empty string = global default; non-empty = user-specific briefing';
COMMENT ON COLUMN briefings.story_segments IS 'Array of {start_char, length} per story for chapter markers / skip-to-story';

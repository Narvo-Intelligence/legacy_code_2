-- Story content: per-story narrative, pre-translations (yo, ha, ig, pcm), and pre-generated audio.
-- Enables instant playback in user's language and detailed summaries from scraped content.

CREATE TABLE IF NOT EXISTS story_content (
  story_id text PRIMARY KEY,
  title text,
  short_summary text,
  narrative text NOT NULL DEFAULT '',
  key_takeaways jsonb DEFAULT '[]'::jsonb,
  translations jsonb DEFAULT '{}'::jsonb,
  audio_by_lang jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE story_content IS 'Cached narrative, translations (Yoruba, Hausa, Igbo, Pidgin), and TTS audio URLs per story for instant playback';
COMMENT ON COLUMN story_content.translations IS 'JSON: { "yo": { "short_summary", "narrative", "key_takeaways" }, "ha", "ig", "pcm" }';
COMMENT ON COLUMN story_content.audio_by_lang IS 'JSON: { "yo": "data:audio/mpeg;base64,...", "ha", "ig", "pcm" }';

CREATE INDEX IF NOT EXISTS idx_story_content_updated_at ON story_content(updated_at DESC);

ALTER TABLE story_content ENABLE ROW LEVEL SECURITY;

-- Allow read for API clients; writes only via service role (bypasses RLS).
CREATE POLICY "Allow read for story_content"
  ON story_content FOR SELECT
  USING (true);

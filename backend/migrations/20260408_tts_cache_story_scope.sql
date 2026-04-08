-- Story-scoped TTS cache metadata (cache_key itself may be v2 SHA256 hex vs legacy MD5 hex)
ALTER TABLE public.tts_cache
  ADD COLUMN IF NOT EXISTS story_id text,
  ADD COLUMN IF NOT EXISTS lang text;

CREATE INDEX IF NOT EXISTS idx_tts_cache_story_id_lang
  ON public.tts_cache (story_id, lang)
  WHERE story_id IS NOT NULL;

COMMENT ON COLUMN public.tts_cache.story_id IS 'Set when row was created from POST /tts/generate with story_id (v2 cache key).';
COMMENT ON COLUMN public.tts_cache.lang IS 'Effective TTS language for this cache row.';

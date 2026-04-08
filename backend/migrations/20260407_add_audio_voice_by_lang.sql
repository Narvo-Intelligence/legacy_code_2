-- Track which TTS voice_id generated each audio_by_lang entry (Settings-aligned playback).
ALTER TABLE public.story_content ADD COLUMN IF NOT EXISTS audio_voice_by_lang jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.story_content.audio_voice_by_lang IS 'JSON: { "en": "emma", "yo": "idera", ... } — voice_id used for audio_by_lang[lang]';

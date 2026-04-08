-- audio_by_lang now stores CDN/object URLs rather than base64 data URLs.

COMMENT ON COLUMN public.story_content.audio_by_lang IS
'JSON: { "en": "https://...mp3", "yo": "https://...mp3", "ha": "https://...mp3", "ig": "https://...mp3", "pcm": "https://...mp3" }';

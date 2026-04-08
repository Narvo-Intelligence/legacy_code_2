-- Document the expanded story_content.translations JSON shape.
-- No structural ALTER is required because translations is already jsonb.

COMMENT ON COLUMN public.story_content.translations IS
'JSON: { "en"|"yo"|"ha"|"ig"|"pcm": { "title", "short_summary", "narrative", "key_takeaways" } }';

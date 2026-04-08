-- Bookmarks: narrative + image for saved-story recall (mirror of supabase/migrations/008_bookmarks_narrative_image.sql).
ALTER TABLE public.bookmarks
  ADD COLUMN IF NOT EXISTS narrative text;

ALTER TABLE public.bookmarks
  ADD COLUMN IF NOT EXISTS image_url text;

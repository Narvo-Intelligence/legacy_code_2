-- Bookmarks: persist full article text and hero image for recall when the story is no longer in the live feed.
ALTER TABLE public.bookmarks
  ADD COLUMN IF NOT EXISTS narrative text;

ALTER TABLE public.bookmarks
  ADD COLUMN IF NOT EXISTS image_url text;

COMMENT ON COLUMN public.bookmarks.narrative IS 'Full Narvo narrative at save time; used when reopening bookmarked stories.';
COMMENT ON COLUMN public.bookmarks.image_url IS 'Hero image URL at save time.';

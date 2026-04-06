-- Realtime for user-scoped tables so the Next.js client can refetch after add/update/delete
-- (bookmarks, offline saves, preferences). RLS already restricts rows to auth.uid().

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'bookmarks'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE bookmarks;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'offline_articles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE offline_articles;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'user_preferences'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE user_preferences;
  END IF;
END $$;

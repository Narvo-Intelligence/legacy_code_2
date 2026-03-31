-- offline_articles: add user_id for per-user persistence (saved/offlined news in DB for future reference).
-- Existing rows get user_id = 'guest'. New saves use authenticated user_id when provided.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'offline_articles' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE offline_articles ADD COLUMN user_id text NOT NULL DEFAULT 'guest';
    ALTER TABLE offline_articles DROP CONSTRAINT IF EXISTS offline_articles_pkey;
    ALTER TABLE offline_articles ADD PRIMARY KEY (user_id, story_id);
    CREATE INDEX IF NOT EXISTS idx_offline_articles_user_id ON offline_articles(user_id);
    CREATE INDEX IF NOT EXISTS idx_offline_articles_user_saved_at ON offline_articles(user_id, saved_at DESC);
  END IF;
END $$;

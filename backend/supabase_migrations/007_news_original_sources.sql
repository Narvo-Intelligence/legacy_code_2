-- Multi-Source Aggregation: store original_sources on news for consensus / citations.
-- Run when you have (or will add) a `news` table. Safe if table does not exist.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'news') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'news' AND column_name = 'original_sources'
    ) THEN
      ALTER TABLE news ADD COLUMN original_sources jsonb DEFAULT '[]'::jsonb;
      COMMENT ON COLUMN news.original_sources IS 'Array of {name, url} for each source used in composite story; e.g. [{"name": "Punch", "url": "..."}]';
    END IF;
  END IF;
END $$;

-- Optional: pgvector for semantic clustering (run when you want vector similarity).
-- Uncomment when ready:
/*
CREATE EXTENSION IF NOT EXISTS vector;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'news') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'news' AND column_name = 'embedding') THEN
      ALTER TABLE news ADD COLUMN embedding vector(768);
      CREATE INDEX IF NOT EXISTS idx_news_embedding ON news USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
    END IF;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION match_related_news(
  query_embedding vector(768),
  match_threshold float,
  match_count int
)
RETURNS TABLE (id uuid, title text, summary text, similarity float)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT news.id, news.title, news.summary, 1 - (news.embedding <=> query_embedding) AS similarity
  FROM news
  WHERE 1 - (news.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;
*/

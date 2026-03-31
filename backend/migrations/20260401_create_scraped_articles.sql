-- Migration: Create scraped_articles table for persistent scraping
-- Author: Narvo AI
-- Date: 2026-04-01

CREATE TABLE IF NOT EXISTS public.scraped_articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    url_hash TEXT UNIQUE NOT NULL,      -- MD5 of original URL for fast lookup
    url TEXT NOT NULL,
    title TEXT,
    full_text TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb, -- Store author, images, publish_date
    scraped_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookup by MD5 hash
CREATE INDEX IF NOT EXISTS idx_scraped_articles_url_hash ON public.scraped_articles (url_hash);

-- Index for original URL lookup
CREATE INDEX IF NOT EXISTS idx_scraped_articles_original_url ON public.scraped_articles (url);

-- RLS: Secure the table for service-role writes and authenticated reads
ALTER TABLE public.scraped_articles ENABLE ROW LEVEL SECURITY;

-- Note: In Supabase, usually 'authenticated' users can read public tables if no policy blocks them, 
-- but we explicitly define it for clarity.
CREATE POLICY "Enable read for authenticated users" 
    ON public.scraped_articles FOR SELECT 
    TO authenticated 
    USING (true);

-- 'service_role' (the backend) has full access by default, but we can verify it
CREATE POLICY "Enable service_role full access" 
    ON public.scraped_articles FOR ALL 
    TO service_role 
    USING (true) 
    WITH CHECK (true);

-- Helpful comments for the Supabase SQL editor
COMMENT ON TABLE public.scraped_articles IS 'Persistent storage for full-text article content extracted by the Narvo scraper.';
COMMENT ON COLUMN public.scraped_articles.url_hash IS 'Unique MD5 hash of the original source URL.';

-- Migration to add sources_used to story_content table
ALTER TABLE public.story_content ADD COLUMN IF NOT EXISTS sources_used TEXT[] DEFAULT '{}';

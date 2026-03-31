-- Migration to add trust scoring and tags to story_content table
ALTER TABLE public.story_content ADD COLUMN IF NOT EXISTS trust_score INTEGER DEFAULT NULL;
ALTER TABLE public.story_content ADD COLUMN IF NOT EXISTS truth_tags TEXT[] DEFAULT '{}';
ALTER TABLE public.story_content ADD COLUMN IF NOT EXISTS truth_explanation TEXT DEFAULT NULL;

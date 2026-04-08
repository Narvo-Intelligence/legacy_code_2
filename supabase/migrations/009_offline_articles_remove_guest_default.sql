-- Offline rows are always user-scoped through authenticated `/api/me/offline` routes.
-- Drop the legacy guest default so new rows cannot silently fall back to anonymous storage.

ALTER TABLE public.offline_articles
  ALTER COLUMN user_id DROP DEFAULT;

COMMENT ON COLUMN public.offline_articles.user_id IS
'Authenticated Supabase user id. Legacy guest rows are retained until explicitly migrated or deleted.';

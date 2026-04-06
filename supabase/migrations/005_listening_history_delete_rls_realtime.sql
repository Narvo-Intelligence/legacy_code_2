-- Allow users to delete their own listening_history rows (client Realtime + optional direct API).
-- Enable postgres changes for listening_history when using Supabase Realtime from the browser.

DROP POLICY IF EXISTS "listening_history_delete_own" ON listening_history;
CREATE POLICY "listening_history_delete_own" ON listening_history FOR DELETE TO authenticated
  USING ((select auth.uid())::text = user_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'listening_history'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE listening_history;
  END IF;
END $$;

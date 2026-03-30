-- RLS policies for authenticated access (Supabase Postgres best practices).
-- Service role bypasses RLS. These policies ensure that when using the anon/authenticated
-- key (e.g. from client), users only see their own data.
-- Uses (select auth.uid()) so the function is called once per query, not per row (security-rls-performance).

-- bookmarks: user sees only own bookmarks
DROP POLICY IF EXISTS "bookmarks_select_own" ON bookmarks;
CREATE POLICY "bookmarks_select_own" ON bookmarks FOR SELECT TO authenticated
  USING ((select auth.uid())::text = user_id);
DROP POLICY IF EXISTS "bookmarks_insert_own" ON bookmarks;
CREATE POLICY "bookmarks_insert_own" ON bookmarks FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid())::text = user_id);
DROP POLICY IF EXISTS "bookmarks_update_own" ON bookmarks;
CREATE POLICY "bookmarks_update_own" ON bookmarks FOR UPDATE TO authenticated
  USING ((select auth.uid())::text = user_id);
DROP POLICY IF EXISTS "bookmarks_delete_own" ON bookmarks;
CREATE POLICY "bookmarks_delete_own" ON bookmarks FOR DELETE TO authenticated
  USING ((select auth.uid())::text = user_id);

-- user_preferences: user sees only own row
DROP POLICY IF EXISTS "user_preferences_select_own" ON user_preferences;
CREATE POLICY "user_preferences_select_own" ON user_preferences FOR SELECT TO authenticated
  USING ((select auth.uid())::text = user_id);
DROP POLICY IF EXISTS "user_preferences_insert_own" ON user_preferences;
CREATE POLICY "user_preferences_insert_own" ON user_preferences FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid())::text = user_id);
DROP POLICY IF EXISTS "user_preferences_update_own" ON user_preferences;
CREATE POLICY "user_preferences_update_own" ON user_preferences FOR UPDATE TO authenticated
  USING ((select auth.uid())::text = user_id);

-- offline_articles: user sees only own articles
DROP POLICY IF EXISTS "offline_articles_select_own" ON offline_articles;
CREATE POLICY "offline_articles_select_own" ON offline_articles FOR SELECT TO authenticated
  USING ((select auth.uid())::text = user_id);
DROP POLICY IF EXISTS "offline_articles_insert_own" ON offline_articles;
CREATE POLICY "offline_articles_insert_own" ON offline_articles FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid())::text = user_id);
DROP POLICY IF EXISTS "offline_articles_update_own" ON offline_articles;
CREATE POLICY "offline_articles_update_own" ON offline_articles FOR UPDATE TO authenticated
  USING ((select auth.uid())::text = user_id);
DROP POLICY IF EXISTS "offline_articles_delete_own" ON offline_articles;
CREATE POLICY "offline_articles_delete_own" ON offline_articles FOR DELETE TO authenticated
  USING ((select auth.uid())::text = user_id);

-- listening_history: user sees only own history
DROP POLICY IF EXISTS "listening_history_select_own" ON listening_history;
CREATE POLICY "listening_history_select_own" ON listening_history FOR SELECT TO authenticated
  USING ((select auth.uid())::text = user_id);
DROP POLICY IF EXISTS "listening_history_insert_own" ON listening_history;
CREATE POLICY "listening_history_insert_own" ON listening_history FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid())::text = user_id);

-- user_subscriptions: user can read own subscription (writes via service role only)
DROP POLICY IF EXISTS "user_subscriptions_select_own" ON user_subscriptions;
CREATE POLICY "user_subscriptions_select_own" ON user_subscriptions FOR SELECT TO authenticated
  USING ((select auth.uid())::text = user_id);

-- briefings: user sees global (user_id = '') or own personalized briefings only
DROP POLICY IF EXISTS "briefings_select_all" ON briefings;
CREATE POLICY "briefings_select_all" ON briefings FOR SELECT TO authenticated, anon
  USING (user_id = '' OR (select auth.uid())::text = user_id);

-- push_subscriptions and tts_cache: no policies = only service_role (and table owner) can access.
-- Keeps backend-only access for push and TTS cache.

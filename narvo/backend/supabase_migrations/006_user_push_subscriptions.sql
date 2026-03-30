-- User-scoped push subscriptions for 5AM briefing alerts (multiple devices per user).
-- Frontend sends subscription via POST /api/user/subscribe-push when authenticated.
CREATE TABLE IF NOT EXISTS user_push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  endpoint text NOT NULL,
  subscription_data jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, endpoint)
);
CREATE INDEX IF NOT EXISTS idx_user_push_subscriptions_user_id ON user_push_subscriptions(user_id);

COMMENT ON TABLE user_push_subscriptions IS 'Web Push subscriptions per user for 5AM briefing alerts; one row per device (endpoint).';

ALTER TABLE user_push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to manage only their own subscriptions.
-- Use (select auth.uid()) so the function is evaluated once per query, not per row (security-rls-performance).
DROP POLICY IF EXISTS "user_push_subscriptions_select_own" ON user_push_subscriptions;
CREATE POLICY "user_push_subscriptions_select_own" ON user_push_subscriptions
  FOR SELECT TO authenticated USING ((select auth.uid())::text = user_id);

DROP POLICY IF EXISTS "user_push_subscriptions_insert_own" ON user_push_subscriptions;
CREATE POLICY "user_push_subscriptions_insert_own" ON user_push_subscriptions
  FOR INSERT TO authenticated WITH CHECK ((select auth.uid())::text = user_id);

DROP POLICY IF EXISTS "user_push_subscriptions_update_own" ON user_push_subscriptions;
CREATE POLICY "user_push_subscriptions_update_own" ON user_push_subscriptions
  FOR UPDATE TO authenticated USING ((select auth.uid())::text = user_id);

DROP POLICY IF EXISTS "user_push_subscriptions_delete_own" ON user_push_subscriptions;
CREATE POLICY "user_push_subscriptions_delete_own" ON user_push_subscriptions
  FOR DELETE TO authenticated USING ((select auth.uid())::text = user_id);

-- Service role (backend) can read all for sending briefing push.
DROP POLICY IF EXISTS "user_push_subscriptions_service_all" ON user_push_subscriptions;
CREATE POLICY "user_push_subscriptions_service_all" ON user_push_subscriptions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

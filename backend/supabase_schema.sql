-- Narvo: Supabase schema (replaces MongoDB collections)
-- Run in Supabase SQL Editor once per project.

-- bookmarks: user_id + story_id unique
CREATE TABLE IF NOT EXISTS bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  story_id text NOT NULL,
  title text,
  summary text,
  source text,
  category text,
  source_url text,
  saved_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, story_id)
);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_saved_at ON bookmarks(user_id, saved_at DESC);

-- user_preferences: one row per user
CREATE TABLE IF NOT EXISTS user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL UNIQUE,
  region text,
  voice text,
  interests jsonb DEFAULT '[]',
  voice_id text,
  playback_speed float DEFAULT 1.0,
  categories jsonb DEFAULT '[]',
  notifications_enabled boolean DEFAULT true,
  settings jsonb,
  updated_at timestamptz DEFAULT now()
);

-- briefings: one per date
CREATE TABLE IF NOT EXISTS briefings (
  id text PRIMARY KEY,
  date date NOT NULL UNIQUE,
  title text,
  generated_at timestamptz,
  duration_estimate text,
  stories jsonb DEFAULT '[]',
  script text,
  audio_url text,
  voice_id text
);
CREATE INDEX IF NOT EXISTS idx_briefings_date ON briefings(date DESC);

-- offline_articles: one per story_id (current app semantics)
CREATE TABLE IF NOT EXISTS offline_articles (
  story_id text PRIMARY KEY,
  title text,
  summary text,
  narrative text,
  source text,
  category text DEFAULT 'General',
  image_url text,
  saved_at timestamptz NOT NULL DEFAULT now()
);

-- listening_history
CREATE TABLE IF NOT EXISTS listening_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  track_id text,
  title text,
  source text,
  category text,
  duration int DEFAULT 0,
  played_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_listening_history_user_played ON listening_history(user_id, played_at DESC);

-- push_subscriptions
CREATE TABLE IF NOT EXISTS push_subscriptions (
  endpoint text PRIMARY KEY,
  subscription_data jsonb,
  subscribed_at timestamptz DEFAULT now()
);

-- tts_cache (optional TTL: run periodic delete on created_at)
CREATE TABLE IF NOT EXISTS tts_cache (
  cache_key text PRIMARY KEY,
  audio_url text,
  translated_text text,
  voice_id text,
  created_at timestamptz DEFAULT now()
);

-- user_subscriptions: one row per user (Free / Pro / Enterprise)
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL UNIQUE,
  tier text NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'enterprise')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'past_due')),
  started_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  external_id text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);

-- RLS: allow service role full access; anon can be restricted later if needed
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE briefings ENABLE ROW LEVEL SECURITY;
ALTER TABLE offline_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE listening_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tts_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy: users can read own subscription (writes via service role only)
-- CREATE POLICY "Users can read own subscription" ON user_subscriptions FOR SELECT USING (user_id = auth.uid()::text);

-- Policy: service role bypasses RLS by default; add policies if you want anon/authenticated access later
-- For backend-only access, no extra policies needed when using service_role key.

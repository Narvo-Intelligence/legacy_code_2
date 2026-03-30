-- Source Reputation: per-source authority score for ReputationDashboard and certainty scoring.
-- Can be seeded from SOURCE_WEIGHTS and updated by editorial or feedback.

CREATE TABLE IF NOT EXISTS source_reputation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_key text NOT NULL UNIQUE,
  display_name text,
  score numeric(5,2) NOT NULL DEFAULT 50 CHECK (score >= 0 AND score <= 100),
  region text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_source_reputation_source_key ON source_reputation(source_key);
CREATE INDEX IF NOT EXISTS idx_source_reputation_score ON source_reputation(score DESC);

COMMENT ON TABLE source_reputation IS 'Authority/reputation score per source (0-100) for dashboard and certainty index.';

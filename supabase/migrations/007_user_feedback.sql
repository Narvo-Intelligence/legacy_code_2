-- User and story feedback submitted via POST /api/feedback (service role insert from backend).
CREATE TABLE IF NOT EXISTS public.user_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid,
  kind text NOT NULL CHECK (kind IN ('story', 'app')),
  story_id text,
  category text,
  message text NOT NULL,
  contact_email text,
  client_path text,
  user_agent text
);

CREATE INDEX IF NOT EXISTS idx_user_feedback_created_at ON public.user_feedback (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_feedback_kind ON public.user_feedback (kind);

COMMENT ON TABLE public.user_feedback IS 'Feedback from Narvo app; written only by backend with service role.';

CREATE TABLE public.tribe_analysis_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  media_item_id UUID NOT NULL REFERENCES public.media_items(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL DEFAULT 'demo-user',
  input_type TEXT NOT NULL CHECK (input_type IN ('text','audio','video')),
  title TEXT,
  analysis_id TEXT,
  shape JSONB NOT NULL DEFAULT '[]'::jsonb,
  segments JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  scores JSONB NOT NULL DEFAULT '{}'::jsonb,
  region_masks JSONB NOT NULL DEFAULT '{}'::jsonb,
  peak_activation_step INTEGER NOT NULL,
  viewer_url TEXT,
  viewer_absolute_url TEXT,
  viewer_available BOOLEAN NOT NULL DEFAULT false,
  viewer_error TEXT,
  result_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tribe_analysis_runs ENABLE ROW LEVEL SECURITY;

-- TRIBE results are written and read only through trusted server functions.
REVOKE ALL ON TABLE public.tribe_analysis_runs FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.tribe_analysis_runs TO service_role;

CREATE POLICY "Service role manages TRIBE analysis runs"
  ON public.tribe_analysis_runs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE INDEX idx_tribe_analysis_runs_media_created
  ON public.tribe_analysis_runs (media_item_id, created_at DESC);

CREATE INDEX idx_tribe_analysis_runs_user_created
  ON public.tribe_analysis_runs (user_id, created_at DESC);

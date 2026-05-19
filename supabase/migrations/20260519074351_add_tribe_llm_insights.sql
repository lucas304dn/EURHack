ALTER TABLE public.tribe_analysis_runs
  ADD COLUMN IF NOT EXISTS insight_summary TEXT,
  ADD COLUMN IF NOT EXISTS score_insights JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS insight_model TEXT,
  ADD COLUMN IF NOT EXISTS insight_error TEXT,
  ADD COLUMN IF NOT EXISTS insight_generated_at TIMESTAMPTZ;

ALTER TABLE public.rw_lessons
  ADD COLUMN IF NOT EXISTS summary_fr text,
  ADD COLUMN IF NOT EXISTS translation_fr text,
  ADD COLUMN IF NOT EXISTS knowledge_point text,
  ADD COLUMN IF NOT EXISTS vocabulary jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS grammar jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS discussion jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS published_by uuid;
ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS question_type TEXT NOT NULL DEFAULT 'mcq',
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS image_alt TEXT,
  ADD COLUMN IF NOT EXISTS voice_gender TEXT,
  ADD COLUMN IF NOT EXISTS accent TEXT,
  ADD COLUMN IF NOT EXISTS speech_rate TEXT;

ALTER TABLE public.test_sessions
  ADD COLUMN IF NOT EXISTS question_ids UUID[] NOT NULL DEFAULT '{}'::uuid[];

CREATE INDEX IF NOT EXISTS idx_questions_active_level_cat
  ON public.questions (is_active, level, category);
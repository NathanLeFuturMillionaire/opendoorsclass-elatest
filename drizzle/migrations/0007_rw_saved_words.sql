CREATE TABLE public.rw_saved_words (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  word text NOT NULL CHECK (char_length(word) BETWEEN 1 AND 40),
  translation_fr text NOT NULL CHECK (char_length(translation_fr) <= 200),
  phonetic text CHECK (char_length(phonetic) <= 80),
  part_of_speech text CHECK (char_length(part_of_speech) <= 60),
  sentence text CHECK (char_length(sentence) <= 400),
  lesson_id uuid REFERENCES public.rw_lessons(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, word)
);
CREATE INDEX rw_saved_words_user_idx ON public.rw_saved_words(user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rw_saved_words TO authenticated;
GRANT ALL ON public.rw_saved_words TO service_role;
ALTER TABLE public.rw_saved_words ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rw own saved words read" ON public.rw_saved_words FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "rw own saved words insert" ON public.rw_saved_words FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "rw own saved words update" ON public.rw_saved_words FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "rw own saved words delete" ON public.rw_saved_words FOR DELETE TO authenticated USING (user_id = auth.uid());
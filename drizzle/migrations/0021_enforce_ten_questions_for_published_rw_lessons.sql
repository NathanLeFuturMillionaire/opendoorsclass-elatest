ALTER TABLE public.rw_lessons
  ADD CONSTRAINT rw_lessons_published_ten_questions
  CHECK (
    status <> 'published'
    OR (
      jsonb_typeof(questions) = 'array'
      AND jsonb_array_length(questions) = 10
    )
  );
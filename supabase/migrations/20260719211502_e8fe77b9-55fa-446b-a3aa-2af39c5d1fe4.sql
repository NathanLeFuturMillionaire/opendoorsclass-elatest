
-- 1) Add speaking to question_category enum
ALTER TYPE public.question_category ADD VALUE IF NOT EXISTS 'speaking';

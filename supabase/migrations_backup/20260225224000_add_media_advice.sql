-- Migration: add_media_advice_to_recruitment_jobs

ALTER TABLE public.recruitment_jobs
ADD COLUMN IF NOT EXISTS media_advice TEXT;

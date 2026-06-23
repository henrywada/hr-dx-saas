ALTER TABLE public.service
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

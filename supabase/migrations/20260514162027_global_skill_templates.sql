-- 業種カテゴリ
CREATE TABLE public.global_job_categories (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 職種マスタ
CREATE TABLE public.global_job_roles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.global_job_categories(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  color_hex   TEXT NOT NULL DEFAULT '#3b82f6',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- スキル項目（職種ごと）
CREATE TABLE public.global_skill_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_role_id UUID NOT NULL REFERENCES public.global_job_roles(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  category    TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- スキルレベル（職種ごと）
CREATE TABLE public.global_skill_levels (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_role_id UUID NOT NULL REFERENCES public.global_job_roles(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  criteria    TEXT,
  color_hex   TEXT NOT NULL DEFAULT '#6b7280',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ON public.global_job_roles (category_id);
CREATE INDEX ON public.global_skill_items (job_role_id);
CREATE INDEX ON public.global_skill_levels (job_role_id);

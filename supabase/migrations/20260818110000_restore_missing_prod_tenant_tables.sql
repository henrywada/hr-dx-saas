-- =============================================================
-- 本番で欠落していた8テーブルの復元
--
--   背景: 2026-08-18、テナント削除CASCADE網羅化マイグレーション
--         （20260818090000）を本番へ適用する過程で、マイグレーション履歴上は
--         「適用済み」と記録されているにもかかわらず、以下3ファイル分・
--         8テーブルが本番の public スキーマに実在しないことが判明した。
--         ローカルには全て正常に存在しており、原因はマイグレーション自体の
--         不備ではなく、適用後に何らかの理由でテーブルが失われたことによる
--         （詳細は project memory: project-prod-missing-tables-drift 参照）。
--
--     - 20260604094429_add_turnover_risk_tables.sql
--         -> turnover_risk_scores, turnover_risk_action_logs
--     - 20260605000000_add_lifecycle_tables.sql
--         -> lifecycle_task_templates, lifecycle_instances, lifecycle_tasks
--     - 20260605100000_add_training_plan_tables.sql
--         -> training_plan_templates, training_plan_template_courses,
--            employee_training_plans
--
--   本マイグレーションは、元ファイルの定義をそのまま復元する（CREATE TABLE
--   IF NOT EXISTS で安全化）。既存データが失われていた期間の実データは
--   存在しない（テーブル自体が無かったため書き込み不可だった）ので、
--   このマイグレーションは新規作成であり、データ復旧ではない。
--
--   唯一の変更点: tenant_id -> tenants.id の外部キーは、テナント削除時に
--   自動でCASCADE削除されるよう ON DELETE CASCADE を付けて作成する
--   （20260818090000 が他の全テーブルに適用したのと同じ最終状態に揃える）。
--   それ以外の列定義・CHECK制約・RLSポリシー・インデックスは元ファイルと
--   完全に同一。
-- =============================================================

-- -------------------------------------------------------------
-- 1. turnover_risk_scores / turnover_risk_action_logs
--    （元: 20260604094429_add_turnover_risk_tables.sql）
-- -------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.turnover_risk_scores (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  employee_id     UUID NOT NULL REFERENCES public.employees(id),
  risk_score      INTEGER NOT NULL CHECK (risk_score >= 0 AND risk_score <= 100),
  risk_level      TEXT NOT NULL CHECK (risk_level IN ('high', 'medium', 'low')),
  score_factors   JSONB NOT NULL DEFAULT '{}',
  calculated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.turnover_risk_scores ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'turnover_risk_scores' AND policyname = 'tenant_isolation'
  ) THEN
    CREATE POLICY "tenant_isolation" ON public.turnover_risk_scores
      FOR ALL USING (
        tenant_id = (
          SELECT tenant_id FROM public.employees WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_turnover_risk_tenant_emp
  ON public.turnover_risk_scores(tenant_id, employee_id, calculated_at DESC);

CREATE INDEX IF NOT EXISTS idx_turnover_risk_level
  ON public.turnover_risk_scores(tenant_id, risk_level, calculated_at DESC);

CREATE TABLE IF NOT EXISTS public.turnover_risk_action_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id),
  logged_by   UUID NOT NULL REFERENCES public.employees(id),
  action_type TEXT NOT NULL CHECK (action_type IN (
    'one_on_one',
    'counseling',
    'manager_talk',
    'hr_interview',
    'other'
  )),
  notes       TEXT,
  actioned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.turnover_risk_action_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'turnover_risk_action_logs' AND policyname = 'tenant_isolation'
  ) THEN
    CREATE POLICY "tenant_isolation" ON public.turnover_risk_action_logs
      FOR ALL USING (
        tenant_id = (
          SELECT tenant_id FROM public.employees WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_turnover_action_employee
  ON public.turnover_risk_action_logs(tenant_id, employee_id, actioned_at DESC);

-- -------------------------------------------------------------
-- 2. lifecycle_task_templates / lifecycle_instances / lifecycle_tasks
--    （元: 20260605000000_add_lifecycle_tables.sql）
-- -------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.lifecycle_task_templates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  lifecycle_type  TEXT NOT NULL CHECK (lifecycle_type IN ('onboarding', 'offboarding')),
  title           TEXT NOT NULL,
  description     TEXT,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.lifecycle_task_templates ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'lifecycle_task_templates' AND policyname = 'tenant_isolation'
  ) THEN
    CREATE POLICY "tenant_isolation" ON public.lifecycle_task_templates
      FOR ALL USING (
        tenant_id = (
          SELECT tenant_id FROM public.employees WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_lifecycle_task_templates_tenant
  ON public.lifecycle_task_templates(tenant_id, lifecycle_type, sort_order);

CREATE TABLE IF NOT EXISTS public.lifecycle_instances (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  employee_id     UUID NOT NULL REFERENCES public.employees(id),
  lifecycle_type  TEXT NOT NULL CHECK (lifecycle_type IN ('onboarding', 'offboarding')),
  status          TEXT NOT NULL DEFAULT 'in_progress'
                  CHECK (status IN ('in_progress', 'completed', 'cancelled')),
  scheduled_date  DATE,
  notes           TEXT,
  created_by      UUID REFERENCES public.employees(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ
);

ALTER TABLE public.lifecycle_instances ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'lifecycle_instances' AND policyname = 'tenant_isolation'
  ) THEN
    CREATE POLICY "tenant_isolation" ON public.lifecycle_instances
      FOR ALL USING (
        tenant_id = (
          SELECT tenant_id FROM public.employees WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_lifecycle_instances_tenant_type
  ON public.lifecycle_instances(tenant_id, lifecycle_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_lifecycle_instances_employee
  ON public.lifecycle_instances(tenant_id, employee_id);

CREATE TABLE IF NOT EXISTS public.lifecycle_tasks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id  UUID NOT NULL REFERENCES public.lifecycle_instances(id) ON DELETE CASCADE,
  tenant_id    UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  description  TEXT,
  assignee_id  UUID REFERENCES public.employees(id),
  status       TEXT NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending', 'in_progress', 'completed')),
  sort_order   INTEGER NOT NULL DEFAULT 0,
  due_date     DATE,
  completed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.lifecycle_tasks ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'lifecycle_tasks' AND policyname = 'tenant_isolation'
  ) THEN
    CREATE POLICY "tenant_isolation" ON public.lifecycle_tasks
      FOR ALL USING (
        tenant_id = (
          SELECT tenant_id FROM public.employees WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_lifecycle_tasks_instance
  ON public.lifecycle_tasks(instance_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_lifecycle_tasks_tenant_assignee
  ON public.lifecycle_tasks(tenant_id, assignee_id);

-- -------------------------------------------------------------
-- 3. training_plan_templates / training_plan_template_courses /
--    employee_training_plans
--    （元: 20260605100000_add_training_plan_tables.sql）
-- -------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.training_plan_templates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  skill_id    UUID REFERENCES public.tenant_skills(id) ON DELETE SET NULL,
  name        TEXT NOT NULL,
  description TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.training_plan_templates ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'training_plan_templates' AND policyname = 'tenant_isolation'
  ) THEN
    CREATE POLICY "tenant_isolation" ON public.training_plan_templates
      FOR ALL USING (
        tenant_id = (
          SELECT tenant_id FROM public.employees WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_training_plan_templates_tenant
  ON public.training_plan_templates(tenant_id, sort_order);

CREATE TABLE IF NOT EXISTS public.training_plan_template_courses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.training_plan_templates(id) ON DELETE CASCADE,
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  course_id   UUID NOT NULL REFERENCES public.el_courses(id) ON DELETE CASCADE,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (template_id, course_id)
);

ALTER TABLE public.training_plan_template_courses ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'training_plan_template_courses' AND policyname = 'tenant_isolation'
  ) THEN
    CREATE POLICY "tenant_isolation" ON public.training_plan_template_courses
      FOR ALL USING (
        tenant_id = (
          SELECT tenant_id FROM public.employees WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_training_plan_template_courses_template
  ON public.training_plan_template_courses(template_id, sort_order);

CREATE TABLE IF NOT EXISTS public.employee_training_plans (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id),
  template_id UUID NOT NULL REFERENCES public.training_plan_templates(id),
  due_date    DATE,
  created_by  UUID REFERENCES public.employees(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.employee_training_plans ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'employee_training_plans' AND policyname = 'tenant_isolation'
  ) THEN
    CREATE POLICY "tenant_isolation" ON public.employee_training_plans
      FOR ALL USING (
        tenant_id = (
          SELECT tenant_id FROM public.employees WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_employee_training_plans_tenant_employee
  ON public.employee_training_plans(tenant_id, employee_id, created_at DESC);

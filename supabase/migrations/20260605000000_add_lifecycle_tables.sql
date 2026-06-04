-- 既存テーブルは一切変更しない。新規テーブルのみ追加。

-- ライフサイクルタスクテンプレート（入社・退社チェックリスト定義）
CREATE TABLE public.lifecycle_task_templates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES public.tenants(id),
  lifecycle_type  TEXT NOT NULL CHECK (lifecycle_type IN ('onboarding', 'offboarding')),
  title           TEXT NOT NULL,
  description     TEXT,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.lifecycle_task_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON public.lifecycle_task_templates
  FOR ALL USING (
    tenant_id = (
      SELECT tenant_id FROM public.employees WHERE user_id = auth.uid()
    )
  );

CREATE INDEX idx_lifecycle_task_templates_tenant
  ON public.lifecycle_task_templates(tenant_id, lifecycle_type, sort_order);

-- ライフサイクルインスタンス（従業員ごとの入退社ワークフロー）
CREATE TABLE public.lifecycle_instances (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES public.tenants(id),
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

CREATE POLICY "tenant_isolation" ON public.lifecycle_instances
  FOR ALL USING (
    tenant_id = (
      SELECT tenant_id FROM public.employees WHERE user_id = auth.uid()
    )
  );

CREATE INDEX idx_lifecycle_instances_tenant_type
  ON public.lifecycle_instances(tenant_id, lifecycle_type, created_at DESC);

CREATE INDEX idx_lifecycle_instances_employee
  ON public.lifecycle_instances(tenant_id, employee_id);

-- ライフサイクルタスク（インスタンス内の個別タスク進捗）
CREATE TABLE public.lifecycle_tasks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id  UUID NOT NULL REFERENCES public.lifecycle_instances(id) ON DELETE CASCADE,
  tenant_id    UUID NOT NULL REFERENCES public.tenants(id),
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

CREATE POLICY "tenant_isolation" ON public.lifecycle_tasks
  FOR ALL USING (
    tenant_id = (
      SELECT tenant_id FROM public.employees WHERE user_id = auth.uid()
    )
  );

CREATE INDEX idx_lifecycle_tasks_instance
  ON public.lifecycle_tasks(instance_id, sort_order);

CREATE INDEX idx_lifecycle_tasks_tenant_assignee
  ON public.lifecycle_tasks(tenant_id, assignee_id);

-- 既存テーブルは一切変更しない。新規テーブルのみ追加。

-- 1on1 セッション記録テーブル
CREATE TABLE public.one_on_one_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES public.tenants(id),
  manager_id      UUID NOT NULL REFERENCES public.employees(id),   -- 記録者（管理職）
  employee_id     UUID NOT NULL REFERENCES public.employees(id),   -- 部下
  theme           TEXT NOT NULL,                                    -- セッションテーマ
  notes           TEXT,                                             -- 記録内容（自由記述）
  next_date       DATE,                                             -- 次回予定日
  conducted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),               -- 実施日時
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.one_on_one_sessions ENABLE ROW LEVEL SECURITY;

-- テナント内の HR・管理職がアクセスできるポリシー
CREATE POLICY "tenant_isolation" ON public.one_on_one_sessions
  FOR ALL USING (
    tenant_id = (
      SELECT tenant_id FROM public.employees WHERE user_id = auth.uid()
    )
  );

CREATE INDEX idx_one_on_one_tenant_manager
  ON public.one_on_one_sessions(tenant_id, manager_id, conducted_at DESC);

CREATE INDEX idx_one_on_one_tenant_employee
  ON public.one_on_one_sessions(tenant_id, employee_id, conducted_at DESC);

-- 1on1 テーマテンプレートテーブル（テナント別カスタマイズ可能）
CREATE TABLE public.one_on_one_theme_templates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id),
  name        TEXT NOT NULL,    -- テーマ名（例: 目標進捗, 悩み相談）
  description TEXT,             -- テーマの説明
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.one_on_one_theme_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON public.one_on_one_theme_templates
  FOR ALL USING (
    tenant_id = (
      SELECT tenant_id FROM public.employees WHERE user_id = auth.uid()
    )
  );

CREATE INDEX idx_theme_templates_tenant
  ON public.one_on_one_theme_templates(tenant_id, sort_order);

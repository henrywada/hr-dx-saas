-- questionnaire_periods テーブル
CREATE TABLE public.questionnaire_periods (
  id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  questionnaire_id       UUID        NOT NULL REFERENCES public.questionnaires(id) ON DELETE CASCADE,
  tenant_id              UUID        NOT NULL,
  period_type            TEXT        NOT NULL DEFAULT 'none'
                         CHECK (period_type IN ('weekly', 'monthly', 'date_range', 'none')),
  label                  TEXT,           -- 表示名: "2024年4月" など
  start_date             DATE,           -- 開始日（none の場合は NULL 可）
  end_date               DATE,           -- 終了日（none の場合は NULL 可）
  status                 TEXT        NOT NULL DEFAULT 'active'
                         CHECK (status IN ('active', 'closed')),
  created_by_employee_id UUID,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS 有効化（必須）
ALTER TABLE public.questionnaire_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "periods_select" ON public.questionnaire_periods
  FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());

CREATE POLICY "periods_insert" ON public.questionnaire_periods
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY "periods_update" ON public.questionnaire_periods
  FOR UPDATE TO authenticated
  USING (tenant_id = public.current_tenant_id());

CREATE POLICY "periods_delete" ON public.questionnaire_periods
  FOR DELETE TO authenticated
  USING (tenant_id = public.current_tenant_id());

-- questionnaire_assignments に period_id を追加
ALTER TABLE public.questionnaire_assignments
  ADD COLUMN IF NOT EXISTS period_id UUID REFERENCES public.questionnaire_periods(id) ON DELETE CASCADE;

-- 期間内で同一従業員の重複アサインを防ぐ（NULL period_id は除外）
CREATE UNIQUE INDEX IF NOT EXISTS uniq_assignment_period_employee
  ON public.questionnaire_assignments (period_id, employee_id)
  WHERE period_id IS NOT NULL;

-- questionnaire_responses に period_id を追加
ALTER TABLE public.questionnaire_responses
  ADD COLUMN IF NOT EXISTS period_id UUID REFERENCES public.questionnaire_periods(id);

-- 期間内で同一従業員が重複回答しないよう一意制約
CREATE UNIQUE INDEX IF NOT EXISTS uniq_response_period_employee
  ON public.questionnaire_responses (period_id, employee_id)
  WHERE period_id IS NOT NULL;

-- インデックス（時系列クエリ用）
CREATE INDEX IF NOT EXISTS idx_periods_questionnaire_id ON public.questionnaire_periods (questionnaire_id);
CREATE INDEX IF NOT EXISTS idx_periods_start_date        ON public.questionnaire_periods (start_date);

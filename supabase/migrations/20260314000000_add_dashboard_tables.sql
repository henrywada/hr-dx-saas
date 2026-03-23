-- トップ（ダッシュボード）画面用テーブル追加
-- 1. announcements: 人事からのお知らせ
-- 2. pulse_survey_periods: 月次パルス調査の期間・期限・表示文言（重要タスク表示用）

-- =============================================================================
-- announcements（人事からのお知らせ）
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text,
  published_at timestamptz NOT NULL DEFAULT now(),
  is_new boolean NOT NULL DEFAULT true,
  target_audience text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.announcements IS '人事からのお知らせ（テナント単位）';
COMMENT ON COLUMN public.announcements.target_audience IS '対象（例: 全社員対象）';
COMMENT ON COLUMN public.announcements.is_new IS 'NEW バッジ表示するか';

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "announcements_tenant_select"
  ON public.announcements FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());

CREATE POLICY "announcements_tenant_insert"
  ON public.announcements FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY "announcements_tenant_update"
  ON public.announcements FOR UPDATE TO authenticated
  USING (tenant_id = public.current_tenant_id());

CREATE POLICY "announcements_tenant_delete"
  ON public.announcements FOR DELETE TO authenticated
  USING (tenant_id = public.current_tenant_id());

-- =============================================================================
-- pulse_survey_periods（月次パルス調査の期間・期限・表示用）
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.pulse_survey_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  survey_period text NOT NULL,
  title text NOT NULL,
  description text,
  deadline_date date NOT NULL,
  link_path text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, survey_period)
);

COMMENT ON TABLE public.pulse_survey_periods IS '月次パルス調査の期間・期限・トップの重要タスク表示用';
COMMENT ON COLUMN public.pulse_survey_periods.survey_period IS '期間キー（例: 2026-02）';
COMMENT ON COLUMN public.pulse_survey_periods.link_path IS '「今すぐ回答する」のリンク先（例: /survey/answer）';

ALTER TABLE public.pulse_survey_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pulse_survey_periods_tenant_select"
  ON public.pulse_survey_periods FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());

CREATE POLICY "pulse_survey_periods_tenant_insert"
  ON public.pulse_survey_periods FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY "pulse_survey_periods_tenant_update"
  ON public.pulse_survey_periods FOR UPDATE TO authenticated
  USING (tenant_id = public.current_tenant_id());

CREATE POLICY "pulse_survey_periods_tenant_delete"
  ON public.pulse_survey_periods FOR DELETE TO authenticated
  USING (tenant_id = public.current_tenant_id());

-- updated_at 自動更新
CREATE TRIGGER set_announcements_updated_at
  BEFORE UPDATE ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_pulse_survey_periods_updated_at
  BEFORE UPDATE ON public.pulse_survey_periods
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ダッシュボード UI 表示制御（要素マスタ + テナント別オーバーライド）
-- 二層: tenant_service（契約）→ tenant_ui_dashboard_element（UI OFF）

-- ---------------------------------------------------------------------------
-- 1. ui_dashboard_element（グローバルマスタ）
-- ---------------------------------------------------------------------------
CREATE TABLE public.ui_dashboard_element (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  element_key TEXT NOT NULL,
  screen      TEXT NOT NULL,
  element_type TEXT NOT NULL,
  label       TEXT NOT NULL,
  description TEXT,
  service_id  UUID REFERENCES public.service(id) ON DELETE SET NULL,
  sort_order  INT NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ui_dashboard_element_element_key_key UNIQUE (element_key),
  CONSTRAINT ui_dashboard_element_screen_check
    CHECK (screen IN ('top', 'adm')),
  CONSTRAINT ui_dashboard_element_type_check
    CHECK (element_type IN ('card', 'button', 'section', 'quick_access', 'kpi', 'notice'))
);

CREATE INDEX ui_dashboard_element_screen_idx
  ON public.ui_dashboard_element (screen, sort_order)
  WHERE is_active = true;

COMMENT ON TABLE public.ui_dashboard_element IS
  'ダッシュボード（/top・/adm）に表示する UI 要素のマスタ';
COMMENT ON COLUMN public.ui_dashboard_element.element_key IS
  'コード参照用一意キー（例: top.card.condition_checkin）';
COMMENT ON COLUMN public.ui_dashboard_element.screen IS
  '表示画面: top | adm';
COMMENT ON COLUMN public.ui_dashboard_element.element_type IS
  '要素種別: card | button | section | quick_access | kpi | notice';
COMMENT ON COLUMN public.ui_dashboard_element.service_id IS
  '契約連動用。NULL の場合は tenant_service チェック不要';

ALTER TABLE public.ui_dashboard_element ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ui_dashboard_element_select_authenticated"
  ON public.ui_dashboard_element
  FOR SELECT
  TO authenticated
  USING (true);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.ui_dashboard_element
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 2. tenant_ui_dashboard_element（テナント別オーバーライド）
-- ---------------------------------------------------------------------------
CREATE TABLE public.tenant_ui_dashboard_element (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  ui_dashboard_element_id  UUID NOT NULL REFERENCES public.ui_dashboard_element(id) ON DELETE CASCADE,
  is_visible               BOOLEAN NOT NULL DEFAULT true,
  updated_by               UUID,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT tenant_ui_dashboard_element_tenant_element_key
    UNIQUE (tenant_id, ui_dashboard_element_id)
);

CREATE INDEX tenant_ui_dashboard_element_tenant_idx
  ON public.tenant_ui_dashboard_element (tenant_id);

COMMENT ON TABLE public.tenant_ui_dashboard_element IS
  'テナント別ダッシュボード UI 表示オーバーライド。行なし＝表示、is_visible=false で非表示';
COMMENT ON COLUMN public.tenant_ui_dashboard_element.is_visible IS
  'false のとき非表示。行が無い場合は表示（オプトアウト）';

ALTER TABLE public.tenant_ui_dashboard_element ENABLE ROW LEVEL SECURITY;

-- 自テナントの SELECT のみ（書込は SaaS / service_role）
CREATE POLICY "tenant_ui_dashboard_element_select_own"
  ON public.tenant_ui_dashboard_element
  FOR SELECT
  TO authenticated
  USING (tenant_id = public.current_tenant_id());

-- SaaS管理者（developer）の書込
CREATE POLICY "tenant_ui_dashboard_element_saas_write"
  ON public.tenant_ui_dashboard_element
  FOR ALL
  TO authenticated
  USING (public.current_employee_app_role() = 'developer')
  WITH CHECK (public.current_employee_app_role() = 'developer');

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.tenant_ui_dashboard_element
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 3. 初期シード
-- ---------------------------------------------------------------------------
INSERT INTO public.ui_dashboard_element
  (element_key, screen, element_type, label, description, sort_order)
VALUES
  -- /top
  ('top.button.hr_inquiry', 'top', 'button', '人事へのお問合せ', '一般画面ヘッダーの人事問合せボタン', 10),
  ('top.card.condition_checkin', 'top', 'card', 'コンディション記録', '日次コンディション記録ウィジェット', 20),
  ('top.card.important_task', 'top', 'card', '重要タスク', '未完了の重要タスクカード', 30),
  ('top.card.stress_check', 'top', 'card', 'ストレスチェック', 'ストレスチェック受検・結果確認カード', 40),
  ('top.section.announcements', 'top', 'section', 'お知らせ', 'お知らせセクション全体', 50),
  ('top.notice.consultation', 'top', 'notice', '相談未対応通知', 'お知らせ内の相談未対応', 60),
  ('top.notice.kudos', 'top', 'notice', '感謝・称賛通知', 'お知らせ内の感謝・称賛', 70),
  ('top.notice.questionnaire', 'top', 'notice', 'アンケート未回答', 'お知らせ内のアンケート未回答', 80),
  ('top.notice.lifecycle', 'top', 'notice', 'ライフサイクルタスク', 'お知らせ内のライフサイクルタスク', 90),
  ('top.section.quick_access', 'top', 'section', 'クイックアクセス', 'クイックアクセスセクション全体', 100),
  ('top.quick_access.interview_booking', 'top', 'quick_access', '産業医面談予約', 'クイックアクセス: 産業医面談予約', 110),
  ('top.quick_access.qr_clock', 'top', 'quick_access', 'QRコード打刻', 'クイックアクセス: 出退勤QR打刻', 120),
  ('top.quick_access.overtime_approve', 'top', 'quick_access', '残業申請の承認', 'クイックアクセス: 残業承認', 130),
  ('top.quick_access.telework', 'top', 'quick_access', 'テレワーク打刻', 'クイックアクセス: テレワーク', 140),
  -- /adm
  ('adm.button.hr_kpi', 'adm', 'button', '横断KPI分析', '管理画面ヘッダーの横断KPIボタン', 10),
  ('adm.button.manual', 'adm', 'button', 'マニュアル', '管理画面ヘッダーのマニュアルボタン', 20),
  ('adm.button.ai_hr_assistant', 'adm', 'button', 'AI人事アシスタント', '組織概要横のAI人事アシスタント', 30),
  ('adm.button.consultation_pending', 'adm', 'button', '相談未対応', '管理画面ヘッダーの相談未対応ボタン', 40),
  ('adm.kpi.headcount', 'adm', 'kpi', '在籍社員数', '組織概要KPI: 在籍社員数', 50),
  ('adm.kpi.hired_this_month', 'adm', 'kpi', '今月入社', '組織概要KPI: 今月入社', 60),
  ('adm.kpi.turnover', 'adm', 'kpi', '離職率', '組織概要KPI: 離職率（年換算）', 70),
  ('adm.kpi.open_positions', 'adm', 'kpi', '採用中ポジション', '組織概要KPI: 採用中ポジション', 80),
  ('adm.section.wellbeing', 'adm', 'section', 'サーベイ・ウェルビーイング', 'ウェルビーイングセクション', 90),
  ('adm.card.pulse', 'adm', 'card', 'パルスサーベイ', 'パルスサーベイカード', 100),
  ('adm.card.one_on_one', 'adm', 'card', '1on1/フォローアップ', '1on1カード', 110),
  ('adm.card.stress_check', 'adm', 'card', 'ストレスチェック', '管理: ストレスチェックカード', 120),
  ('adm.card.kudos', 'adm', 'card', '感謝・称賛', '感謝・称賛カード', 130),
  ('adm.card.condition', 'adm', 'card', 'コンディション記録', '管理: コンディション記録カード', 140),
  ('adm.card.consultation', 'adm', 'card', '悩み・相談窓口', '相談窓口カード', 150),
  ('adm.card.events', 'adm', 'card', '社内イベント・表彰', 'イベント・表彰カード', 160),
  ('adm.section.growth', 'adm', 'section', '学習・成長', '学習・成長セクション', 170),
  ('adm.card.skill_map', 'adm', 'card', 'スキル・能力向上', 'スキルマップカード', 180),
  ('adm.card.evaluation', 'adm', 'card', '人事評価', '人事評価カード', 190),
  ('adm.card.career', 'adm', 'card', 'キャリア面談', 'キャリア面談カード', 200),
  ('adm.card.elearning', 'adm', 'card', 'eラーニング', 'eラーニングカード', 210),
  ('adm.card.survey', 'adm', 'card', 'アンケート（汎用）', 'アンケートカード', 220),
  ('adm.section.toolbox', 'adm', 'section', 'ツールボックス', 'ツールボックスセクション', 230);

-- service_id を route_path から紐付け（存在する場合のみ）
UPDATE public.ui_dashboard_element e
SET service_id = s.id
FROM (
  VALUES
    ('top.card.stress_check', '/stress-check'),
    ('top.quick_access.qr_clock', '/adm/qr_atendance'),
    ('adm.button.hr_kpi', '/adm/hr-kpi'),
    ('adm.button.ai_hr_assistant', '/adm/hr-assistant'),
    ('adm.card.one_on_one', '/adm/one-on-one'),
    ('adm.card.stress_check', '/adm/stress-check/group-analysis'),
    ('adm.card.kudos', '/adm/kudos-stats'),
    ('adm.card.condition', '/adm/condition-trend'),
    ('adm.card.consultation', '/adm/consultation-queue'),
    ('adm.card.events', '/adm/events-awards'),
    ('adm.card.skill_map', '/adm/skill-map'),
    ('adm.card.evaluation', '/adm/evaluation'),
    ('adm.card.career', '/adm/career-discussions'),
    ('adm.card.elearning', '/adm/el-courses'),
    ('adm.card.survey', '/adm/Survey'),
    ('adm.card.pulse', '/adm/Survey')
) AS e_map(element_key, route_path)
JOIN public.service s ON trim(s.route_path) = e_map.route_path
WHERE e.element_key = e_map.element_key;

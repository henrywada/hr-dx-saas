-- ============================================================
-- ストレスチェック機能 マイグレーション
-- ファイル: supabase/migrations/20260303000000_stress_check.sql
-- 
-- 目的:
--   1. 従業員が受益する（自身のストレス状態を把握）
--   2. 人事部が「組織の健康度を把握する」（集団分析）
--
-- 準拠: 厚労省「ストレスチェック制度実施マニュアル」
--       職業性ストレス簡易調査票（57問）
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 0. ヘルパー関数: current_employee_id()
--    ログインユーザーの employee.id を返す
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.current_employee_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT e.id
  FROM public.employees e
  WHERE e.user_id = auth.uid()
  LIMIT 1
$$;

COMMENT ON FUNCTION public.current_employee_id()
  IS 'ログインユーザーに紐づく employees.id を返す';

-- ────────────────────────────────────────────────────────────
-- 0b. ヘルパー関数: current_employee_app_role()
--     ログインユーザーの app_role.app_role (text) を返す
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.current_employee_app_role()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ar.app_role
  FROM public.employees e
  JOIN public.app_role ar ON ar.id = e.app_role_id
  WHERE e.user_id = auth.uid()
  LIMIT 1
$$;

COMMENT ON FUNCTION public.current_employee_app_role()
  IS 'ログインユーザーの app_role テキスト値を返す';

-- ============================================================
-- 1. stress_check_periods（実施期間管理）
-- ============================================================
CREATE TABLE public.stress_check_periods (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id       uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  fiscal_year     int NOT NULL,
  title           text NOT NULL DEFAULT '',
  questionnaire_type text NOT NULL DEFAULT '57'
                  CHECK (questionnaire_type IN ('57', '23')),
  start_date      date NOT NULL,
  end_date        date NOT NULL,
  status          text NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft', 'active', 'closed', 'analyzed')),
  -- 高ストレス判定方法: 'combined'=合計点+B領域, 'b_only'=B領域のみ
  high_stress_method text NOT NULL DEFAULT 'combined'
                  CHECK (high_stress_method IN ('combined', 'b_only')),
  notification_text text,           -- 受検案内文
  created_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT valid_period CHECK (end_date >= start_date),
  CONSTRAINT unique_tenant_fiscal UNIQUE (tenant_id, fiscal_year)
);

COMMENT ON TABLE public.stress_check_periods
  IS 'ストレスチェック実施期間（年度単位）';

-- ============================================================
-- 2. stress_check_questions（質問マスタ）
-- ============================================================
CREATE TABLE public.stress_check_questions (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  questionnaire_type text NOT NULL DEFAULT '57'
                  CHECK (questionnaire_type IN ('57', '23')),
  category        text NOT NULL
                  CHECK (category IN ('A', 'B', 'C', 'D')),
  question_no     int NOT NULL,       -- A1=1, A2=2, ... B1=1, ...
  question_text   text NOT NULL,
  -- 回答選択肢ラベル（4段階）
  scale_labels    jsonb NOT NULL DEFAULT '["そうだ","まあそうだ","ややちがう","ちがう"]',
  -- 配点（正順: [4,3,2,1], 逆転: [1,2,3,4]）
  score_weights   jsonb NOT NULL DEFAULT '[4,3,2,1]',
  is_reverse      boolean NOT NULL DEFAULT false,
  -- 所属する尺度（素点換算表の尺度名）
  scale_name      text NOT NULL,      -- 例: '心理的な仕事の負担（量）'
  sort_order      int NOT NULL,       -- 全体通し番号 1〜57
  CONSTRAINT unique_type_sort UNIQUE (questionnaire_type, sort_order)
);

COMMENT ON TABLE public.stress_check_questions
  IS '職業性ストレス簡易調査票 質問マスタ（57問/23問）';

-- ============================================================
-- 3. stress_check_responses（個人回答）
-- ============================================================
CREATE TABLE public.stress_check_responses (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id       uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  period_id       uuid NOT NULL REFERENCES public.stress_check_periods(id) ON DELETE CASCADE,
  employee_id     uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  question_id     uuid NOT NULL REFERENCES public.stress_check_questions(id) ON DELETE CASCADE,
  answer          int NOT NULL CHECK (answer BETWEEN 1 AND 4),
  answered_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_response UNIQUE (period_id, employee_id, question_id)
);

COMMENT ON TABLE public.stress_check_responses
  IS 'ストレスチェック個人回答（1行=1問の回答）';

-- ============================================================
-- 4. stress_check_submissions（受検ステータス管理）
-- ============================================================
CREATE TABLE public.stress_check_submissions (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id       uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  period_id       uuid NOT NULL REFERENCES public.stress_check_periods(id) ON DELETE CASCADE,
  employee_id     uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  status          text NOT NULL DEFAULT 'not_started'
                  CHECK (status IN ('not_started', 'in_progress', 'submitted')),
  started_at      timestamptz,
  submitted_at    timestamptz,
  -- 本人同意: 事業者（人事等）への結果提供に同意するか
  consent_to_employer boolean NOT NULL DEFAULT false,
  consent_at      timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_submission UNIQUE (period_id, employee_id)
);

COMMENT ON TABLE public.stress_check_submissions
  IS '受検ステータス管理（途中保存・提出・同意管理）';

-- ============================================================
-- 5. stress_check_results（個人結果・判定）
-- ============================================================
CREATE TABLE public.stress_check_results (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id       uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  period_id       uuid NOT NULL REFERENCES public.stress_check_periods(id) ON DELETE CASCADE,
  employee_id     uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  -- 領域別素点
  score_a         int,  -- 仕事のストレス要因（素点合計）
  score_b         int,  -- 心身のストレス反応（素点合計）
  score_c         int,  -- 周囲のサポート（素点合計）
  score_d         int,  -- 満足度（素点合計）
  -- 尺度別詳細スコア（JSON: { "尺度名": { "raw": 12, "level": 3 }, ... }）
  scale_scores    jsonb,
  -- 高ストレス判定
  is_high_stress  boolean NOT NULL DEFAULT false,
  high_stress_reason text,  -- 判定理由（'b_only' or 'combined'）
  -- 面接指導
  needs_interview boolean NOT NULL DEFAULT false,
  interview_requested boolean NOT NULL DEFAULT false,
  interview_requested_at timestamptz,
  -- 計算メタ
  calculated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_result UNIQUE (period_id, employee_id)
);

COMMENT ON TABLE public.stress_check_results
  IS 'ストレスチェック個人結果（採点・高ストレス判定）';

-- ============================================================
-- 6. stress_check_interviews（面接指導記録）
-- ============================================================
CREATE TABLE public.stress_check_interviews (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id       uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  period_id       uuid NOT NULL REFERENCES public.stress_check_periods(id) ON DELETE CASCADE,
  employee_id     uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  result_id       uuid NOT NULL REFERENCES public.stress_check_results(id) ON DELETE CASCADE,
  -- 面接実施情報
  doctor_employee_id uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  interview_date  date,
  interview_status text NOT NULL DEFAULT 'pending'
                  CHECK (interview_status IN ('pending', 'scheduled', 'completed', 'cancelled')),
  -- 医師の意見
  doctor_opinion  text,
  -- 就業措置
  work_measures   text,  -- '通常勤務', '就業制限', '要休業' 等
  measure_details text,
  -- フォローアップ
  follow_up_date  date,
  follow_up_notes text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.stress_check_interviews
  IS '面接指導記録（産業医による面接・意見・就業措置）';

-- ============================================================
-- 7. stress_check_group_analysis（集団分析結果）
-- ============================================================
CREATE TABLE public.stress_check_group_analysis (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id       uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  period_id       uuid NOT NULL REFERENCES public.stress_check_periods(id) ON DELETE CASCADE,
  division_id     uuid REFERENCES public.divisions(id) ON DELETE SET NULL,
  -- NULL = 全社集計
  group_name      text NOT NULL,      -- 部署名 or '全社'
  respondent_count int NOT NULL DEFAULT 0,
  -- 集計スコア（仕事のストレス判定図用）
  avg_score_a     numeric(5,2),       -- 仕事のストレス要因 平均
  avg_score_b     numeric(5,2),       -- 心身のストレス反応 平均
  avg_score_c     numeric(5,2),       -- 周囲のサポート 平均
  avg_score_d     numeric(5,2),       -- 満足度 平均
  -- 尺度別平均（JSON）
  scale_averages  jsonb,
  -- 健康リスク指標
  health_risk_a   numeric(5,1),       -- 仕事のストレス判定図: 量-コントロール
  health_risk_b   numeric(5,1),       -- 仕事のストレス判定図: 上司支援-同僚支援
  total_health_risk numeric(5,1),     -- 総合健康リスク = A × B / 100
  -- 10人未満フラグ（個人特定防止）
  is_suppressed   boolean NOT NULL DEFAULT false,
  high_stress_count int,
  high_stress_rate numeric(5,2),
  calculated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_group_analysis UNIQUE (period_id, division_id)
);

COMMENT ON TABLE public.stress_check_group_analysis
  IS '集団分析結果（部署別・全社、仕事のストレス判定図データ）';

-- ============================================================
-- 8. インデックス
-- ============================================================
CREATE INDEX idx_sc_periods_tenant ON public.stress_check_periods(tenant_id);
CREATE INDEX idx_sc_periods_status ON public.stress_check_periods(tenant_id, status);

CREATE INDEX idx_sc_questions_type ON public.stress_check_questions(questionnaire_type, sort_order);
CREATE INDEX idx_sc_questions_category ON public.stress_check_questions(category);

CREATE INDEX idx_sc_responses_period_emp ON public.stress_check_responses(period_id, employee_id);
CREATE INDEX idx_sc_responses_tenant ON public.stress_check_responses(tenant_id);

CREATE INDEX idx_sc_submissions_period ON public.stress_check_submissions(period_id, status);
CREATE INDEX idx_sc_submissions_tenant ON public.stress_check_submissions(tenant_id);

CREATE INDEX idx_sc_results_period ON public.stress_check_results(period_id);
CREATE INDEX idx_sc_results_tenant ON public.stress_check_results(tenant_id);
CREATE INDEX idx_sc_results_high_stress ON public.stress_check_results(period_id, is_high_stress)
  WHERE is_high_stress = true;

CREATE INDEX idx_sc_interviews_period ON public.stress_check_interviews(period_id);
CREATE INDEX idx_sc_interviews_tenant ON public.stress_check_interviews(tenant_id);
CREATE INDEX idx_sc_interviews_doctor ON public.stress_check_interviews(doctor_employee_id);

CREATE INDEX idx_sc_group_period ON public.stress_check_group_analysis(period_id);
CREATE INDEX idx_sc_group_tenant ON public.stress_check_group_analysis(tenant_id);

-- ============================================================
-- 9. RLS 有効化 + ポリシー
-- ============================================================

-- ── 9a. stress_check_periods ──
ALTER TABLE public.stress_check_periods ENABLE ROW LEVEL SECURITY;

-- テナント分離（CRUD）
CREATE POLICY "sc_periods_select_same_tenant"
  ON public.stress_check_periods FOR SELECT
  USING (tenant_id = public.current_tenant_id());

CREATE POLICY "sc_periods_insert_same_tenant"
  ON public.stress_check_periods FOR INSERT
  WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY "sc_periods_update_same_tenant"
  ON public.stress_check_periods FOR UPDATE
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY "sc_periods_delete_same_tenant"
  ON public.stress_check_periods FOR DELETE
  USING (tenant_id = public.current_tenant_id());

-- SaaS管理者フルアクセス
CREATE POLICY "supa_sc_periods_all"
  ON public.stress_check_periods
  USING (auth.uid() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999'::uuid)
  WITH CHECK (auth.uid() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999'::uuid);

-- ── 9b. stress_check_questions（グローバル読み取り）──
ALTER TABLE public.stress_check_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sc_questions_select_authenticated"
  ON public.stress_check_questions FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "sc_questions_write_service_role"
  ON public.stress_check_questions
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "supa_sc_questions_all"
  ON public.stress_check_questions
  USING (auth.uid() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999'::uuid)
  WITH CHECK (auth.uid() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999'::uuid);

-- ── 9c. stress_check_responses ──
ALTER TABLE public.stress_check_responses ENABLE ROW LEVEL SECURITY;

-- 本人のみ読み書き
CREATE POLICY "sc_responses_select_own"
  ON public.stress_check_responses FOR SELECT
  USING (
    tenant_id = public.current_tenant_id()
    AND employee_id = public.current_employee_id()
  );

CREATE POLICY "sc_responses_insert_own"
  ON public.stress_check_responses FOR INSERT
  WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND employee_id = public.current_employee_id()
  );

CREATE POLICY "sc_responses_update_own"
  ON public.stress_check_responses FOR UPDATE
  USING (
    tenant_id = public.current_tenant_id()
    AND employee_id = public.current_employee_id()
  )
  WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND employee_id = public.current_employee_id()
  );

-- 実施者（産業医・保健師）は全回答閲覧可
CREATE POLICY "sc_responses_select_implementer"
  ON public.stress_check_responses FOR SELECT
  USING (
    tenant_id = public.current_tenant_id()
    AND public.current_employee_app_role() IN ('company_doctor', 'company_nurse')
  );

CREATE POLICY "supa_sc_responses_all"
  ON public.stress_check_responses
  USING (auth.uid() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999'::uuid)
  WITH CHECK (auth.uid() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999'::uuid);

-- ── 9d. stress_check_submissions ──
ALTER TABLE public.stress_check_submissions ENABLE ROW LEVEL SECURITY;

-- 本人: 自分の提出状況を読み書き
CREATE POLICY "sc_submissions_select_own"
  ON public.stress_check_submissions FOR SELECT
  USING (
    tenant_id = public.current_tenant_id()
    AND employee_id = public.current_employee_id()
  );

CREATE POLICY "sc_submissions_insert_own"
  ON public.stress_check_submissions FOR INSERT
  WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND employee_id = public.current_employee_id()
  );

CREATE POLICY "sc_submissions_update_own"
  ON public.stress_check_submissions FOR UPDATE
  USING (
    tenant_id = public.current_tenant_id()
    AND employee_id = public.current_employee_id()
  )
  WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND employee_id = public.current_employee_id()
  );

-- 人事: 受検状況（ステータスのみ）閲覧可
CREATE POLICY "sc_submissions_select_hr"
  ON public.stress_check_submissions FOR SELECT
  USING (
    tenant_id = public.current_tenant_id()
    AND public.current_employee_app_role() IN ('hr', 'hr_manager')
  );

-- 実施者: 全件閲覧可
CREATE POLICY "sc_submissions_select_implementer"
  ON public.stress_check_submissions FOR SELECT
  USING (
    tenant_id = public.current_tenant_id()
    AND public.current_employee_app_role() IN ('company_doctor', 'company_nurse')
  );

CREATE POLICY "supa_sc_submissions_all"
  ON public.stress_check_submissions
  USING (auth.uid() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999'::uuid)
  WITH CHECK (auth.uid() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999'::uuid);

-- ── 9e. stress_check_results ──
ALTER TABLE public.stress_check_results ENABLE ROW LEVEL SECURITY;

-- ★ 法令準拠: 個人結果は本人のみ閲覧
CREATE POLICY "sc_results_select_own"
  ON public.stress_check_results FOR SELECT
  USING (
    tenant_id = public.current_tenant_id()
    AND employee_id = public.current_employee_id()
  );

-- 実施者（産業医・保健師）は全結果閲覧可
CREATE POLICY "sc_results_select_implementer"
  ON public.stress_check_results FOR SELECT
  USING (
    tenant_id = public.current_tenant_id()
    AND public.current_employee_app_role() IN ('company_doctor', 'company_nurse')
  );

-- 人事: 同意者のみ閲覧可
CREATE POLICY "sc_results_select_hr_consented"
  ON public.stress_check_results FOR SELECT
  USING (
    tenant_id = public.current_tenant_id()
    AND public.current_employee_app_role() IN ('hr', 'hr_manager')
    AND EXISTS (
      SELECT 1 FROM public.stress_check_submissions s
      WHERE s.period_id = stress_check_results.period_id
        AND s.employee_id = stress_check_results.employee_id
        AND s.consent_to_employer = true
    )
  );

-- service_role（Server Actions）からの書き込み
CREATE POLICY "sc_results_write_service_role"
  ON public.stress_check_results
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "supa_sc_results_all"
  ON public.stress_check_results
  USING (auth.uid() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999'::uuid)
  WITH CHECK (auth.uid() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999'::uuid);

-- ── 9f. stress_check_interviews ──
ALTER TABLE public.stress_check_interviews ENABLE ROW LEVEL SECURITY;

-- 本人: 自分の面接記録を閲覧
CREATE POLICY "sc_interviews_select_own"
  ON public.stress_check_interviews FOR SELECT
  USING (
    tenant_id = public.current_tenant_id()
    AND employee_id = public.current_employee_id()
  );

-- 産業医: テナント内全件CRUD
CREATE POLICY "sc_interviews_select_doctor"
  ON public.stress_check_interviews FOR SELECT
  USING (
    tenant_id = public.current_tenant_id()
    AND public.current_employee_app_role() IN ('company_doctor', 'company_nurse')
  );

CREATE POLICY "sc_interviews_insert_doctor"
  ON public.stress_check_interviews FOR INSERT
  WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND public.current_employee_app_role() IN ('company_doctor', 'company_nurse')
  );

CREATE POLICY "sc_interviews_update_doctor"
  ON public.stress_check_interviews FOR UPDATE
  USING (
    tenant_id = public.current_tenant_id()
    AND public.current_employee_app_role() IN ('company_doctor', 'company_nurse')
  )
  WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND public.current_employee_app_role() IN ('company_doctor', 'company_nurse')
  );

-- 人事: 同意者の面接記録のみ閲覧
CREATE POLICY "sc_interviews_select_hr_consented"
  ON public.stress_check_interviews FOR SELECT
  USING (
    tenant_id = public.current_tenant_id()
    AND public.current_employee_app_role() IN ('hr', 'hr_manager')
    AND EXISTS (
      SELECT 1 FROM public.stress_check_submissions s
      WHERE s.period_id = stress_check_interviews.period_id
        AND s.employee_id = stress_check_interviews.employee_id
        AND s.consent_to_employer = true
    )
  );

CREATE POLICY "supa_sc_interviews_all"
  ON public.stress_check_interviews
  USING (auth.uid() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999'::uuid)
  WITH CHECK (auth.uid() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999'::uuid);

-- ── 9g. stress_check_group_analysis ──
ALTER TABLE public.stress_check_group_analysis ENABLE ROW LEVEL SECURITY;

-- 人事・産業医・安全衛生委員: テナント内閲覧
CREATE POLICY "sc_group_select_authorized"
  ON public.stress_check_group_analysis FOR SELECT
  USING (
    tenant_id = public.current_tenant_id()
    AND public.current_employee_app_role() IN (
      'hr', 'hr_manager', 'company_doctor', 'company_nurse', 'hsc'
    )
  );

-- service_role からの書き込み
CREATE POLICY "sc_group_write_service_role"
  ON public.stress_check_group_analysis
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "supa_sc_group_all"
  ON public.stress_check_group_analysis
  USING (auth.uid() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999'::uuid)
  WITH CHECK (auth.uid() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999'::uuid);

-- ============================================================
-- 10. GRANT（既存パターンに合わせる）
-- ============================================================
GRANT ALL ON TABLE public.stress_check_periods TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.stress_check_questions TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.stress_check_responses TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.stress_check_submissions TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.stress_check_results TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.stress_check_interviews TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.stress_check_group_analysis TO anon, authenticated, service_role;

GRANT ALL ON FUNCTION public.current_employee_id() TO anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.current_employee_app_role() TO anon, authenticated, service_role;

-- ============================================================
-- 11. updated_at 自動更新トリガー
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sc_periods_updated_at
  BEFORE UPDATE ON public.stress_check_periods
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_sc_submissions_updated_at
  BEFORE UPDATE ON public.stress_check_submissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_sc_interviews_updated_at
  BEFORE UPDATE ON public.stress_check_interviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 12. サービスカタログ登録（既存パターンに合わせる）
-- ============================================================
-- ストレスチェックサービスを service テーブルに追加
INSERT INTO public.service (id, service_category_id, name, category, title, description, sort_order, route_path, target_audience, release_status)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  '1dc338ff-19d7-407e-94e4-06e60b1339a0',  -- '組織の健康度測定' カテゴリ
  'ストレスチェック',
  NULL,
  'ストレスチェック（57問）',
  '厚労省準拠の職業性ストレス簡易調査票による定期ストレスチェック。個人結果フィードバック・集団分析・面接指導管理。',
  10020,
  '',
  'all_users',
  '公開'
);

-- 全ロールにサービス紐付け（受検は全従業員対象）
INSERT INTO public.app_role_service (id, app_role_id, service_id) VALUES
  (gen_random_uuid(), '03c94882-88b0-4937-887b-c3733ab21028', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'),  -- employee
  (gen_random_uuid(), 'c50ebd55-3466-43dc-a702-5d8321908d69', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'),  -- hr_manager
  (gen_random_uuid(), 'f422469d-c1e0-4a10-ac6c-4b656b4fec64', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'),  -- hr
  (gen_random_uuid(), '7f8a303e-3b13-4fac-a0f0-6716b44a5711', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'),  -- company_doctor
  (gen_random_uuid(), 'bc2f9ef0-1ddc-408a-ba9f-93cd26955f81', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'),  -- company_nurse
  (gen_random_uuid(), 'b239a055-8175-43bc-acae-a7d44dff75d5', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'),  -- hsc
  (gen_random_uuid(), '74f8e05b-c99d-45ee-b368-fdbe35ee0e52', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'),  -- developer
  (gen_random_uuid(), '25d560ff-0166-49a5-b29c-24711664bd6d', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890');  -- test

-- =============================================================================
-- ストレスチェック「高ストレス者に対する面接指導」記録テーブル
-- 厚生労働省「ストレスチェック実施マニュアル」第7章準拠
-- 産業医・保健師が面接記録、医師の意見、就業上の措置を記録
-- 個人情報保護を徹底（実名は人事のみ、産業医・保健師は匿名表示前提）
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. テーブル作成
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stress_interview_records (
  -- 主キー
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- テナント・紐づけ
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  stress_result_id uuid NOT NULL REFERENCES public.stress_check_results(id) ON DELETE CASCADE,

  -- 面接実施者・対象者（employees 参照）
  doctor_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE RESTRICT,
  interviewee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,

  -- 面接実施日時・時間
  interview_date timestamptz NOT NULL DEFAULT NOW(),
  interview_duration integer,  -- 面接時間（分）、任意

  -- 面接内容の記録（任意）
  interview_notes text,

  -- 医師の意見（第7章(5)に必須。実施済の場合は必須）
  doctor_opinion text,

  -- 就業上の措置
  measure_type text CHECK (measure_type IN ('配置転換', '労働時間短縮', '休業', 'その他', '措置不要')),
  measure_details text,

  -- フォローアップ
  follow_up_date date,
  follow_up_status text DEFAULT '未実施' CHECK (follow_up_status IN ('未実施', '実施済', 'キャンセル', '継続観察')),

  -- 面接指導のステータス（予約レコード対応）
  -- scheduled=予約済, completed=実施済, cancelled=キャンセル, pending=未予約
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('pending', 'scheduled', 'completed', 'cancelled')),

  -- 実施済の場合は医師意見必須
  CONSTRAINT chk_doctor_opinion_when_completed CHECK (
    status != 'completed' OR (doctor_opinion IS NOT NULL AND trim(doctor_opinion) != '')
  ),

  -- 監査
  created_by uuid NOT NULL REFERENCES public.employees(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

-- テーブル・カラムコメント
COMMENT ON TABLE public.stress_interview_records IS '高ストレス者に対する面接指導記録（厚労省マニュアル第7章準拠）';
COMMENT ON COLUMN public.stress_interview_records.stress_result_id IS '紐づくストレスチェック結果ID';
COMMENT ON COLUMN public.stress_interview_records.doctor_id IS '面接を実施した産業医・保健師の社員ID';
COMMENT ON COLUMN public.stress_interview_records.interviewee_id IS '面接を受けた社員ID';
COMMENT ON COLUMN public.stress_interview_records.doctor_opinion IS '医師の意見（第7章(5)必須。status=completed の場合は必須）';
COMMENT ON COLUMN public.stress_interview_records.measure_type IS '就業上の措置の種類';
COMMENT ON COLUMN public.stress_interview_records.status IS '面接指導のステータス（予約〜実施済まで対応）';

-- -----------------------------------------------------------------------------
-- 2. インデックス（高速検索用）
-- -----------------------------------------------------------------------------
CREATE INDEX idx_stress_interview_records_tenant_interview_date
  ON public.stress_interview_records (tenant_id, interview_date DESC);

CREATE INDEX idx_stress_interview_records_tenant_stress_result
  ON public.stress_interview_records (tenant_id, stress_result_id);

CREATE INDEX idx_stress_interview_records_tenant_interviewee
  ON public.stress_interview_records (tenant_id, interviewee_id);

CREATE INDEX idx_stress_interview_records_tenant_doctor
  ON public.stress_interview_records (tenant_id, doctor_id);

-- -----------------------------------------------------------------------------
-- 3. updated_at 自動更新トリガー
-- -----------------------------------------------------------------------------
CREATE TRIGGER trg_stress_interview_records_updated_at
  BEFORE UPDATE ON public.stress_interview_records
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- -----------------------------------------------------------------------------
-- 4. RLS（Row Level Security）設定
-- 機微な個人情報のため厳格なアクセス制御
-- -----------------------------------------------------------------------------
ALTER TABLE public.stress_interview_records ENABLE ROW LEVEL SECURITY;

-- 4.1 産業医・保健師：フルアクセス（SELECT, INSERT, UPDATE, DELETE）
CREATE POLICY "stress_interview_records_doctor_nurse_all"
  ON public.stress_interview_records
  FOR ALL
  USING (
    tenant_id = public.current_tenant_id()
    AND public.current_employee_app_role() IN ('company_doctor', 'company_nurse')
  )
  WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND public.current_employee_app_role() IN ('company_doctor', 'company_nurse')
  );

-- 4.2 人事責任者・人事：参照のみ（consent_to_employer が true の件のみ）
CREATE POLICY "stress_interview_records_hr_select_consented"
  ON public.stress_interview_records
  FOR SELECT
  USING (
    tenant_id = public.current_tenant_id()
    AND public.current_employee_app_role() IN ('hr', 'hr_manager')
    AND EXISTS (
      SELECT 1
      FROM public.stress_check_results sr
      JOIN public.stress_check_submissions s
        ON s.period_id = sr.period_id
       AND s.employee_id = sr.employee_id
       AND s.consent_to_employer = true
      WHERE sr.id = stress_interview_records.stress_result_id
    )
  );

-- 4.3 SaaS管理者（supaUser）用バイパス
CREATE POLICY "stress_interview_records_supa_all"
  ON public.stress_interview_records
  USING (auth.uid() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999'::uuid)
  WITH CHECK (auth.uid() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999'::uuid);

-- -----------------------------------------------------------------------------
-- 5. 権限付与
-- -----------------------------------------------------------------------------
GRANT ALL ON TABLE public.stress_interview_records TO anon;
GRANT ALL ON TABLE public.stress_interview_records TO authenticated;
GRANT ALL ON TABLE public.stress_interview_records TO service_role;

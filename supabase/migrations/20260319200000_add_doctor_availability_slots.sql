-- =============================================================================
-- 産業医の稼働日時スロットテーブル
-- 面談予約カレンダーで、稼働日時のみ予約可能とするためのマスタ
-- 既存データには一切影響しない（新規テーブルのみ作成）
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. テーブル作成
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.doctor_availability_slots (
  -- 主キー
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- テナント・紐づけ
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  doctor_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,

  -- スロット種別: 繰り返し（曜日） or 特定日
  -- 繰り返し: day_of_week のみ使用、specific_date は NULL
  -- 特定日: specific_date のみ使用、day_of_week は NULL
  day_of_week smallint CHECK (day_of_week >= 0 AND day_of_week <= 6),
  specific_date date,

  -- 時間帯
  start_time time NOT NULL,
  end_time time NOT NULL,

  -- 有効フラグ
  is_active boolean NOT NULL DEFAULT true,

  -- 監査
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- 制約: 繰り返し or 特定日のいずれか
  CONSTRAINT chk_slot_type CHECK (
    (day_of_week IS NOT NULL AND specific_date IS NULL) OR
    (day_of_week IS NULL AND specific_date IS NOT NULL)
  ),
  -- 制約: 終了時刻は開始時刻より後
  CONSTRAINT chk_time_range CHECK (end_time > start_time)
);

-- テーブル・カラムコメント
COMMENT ON TABLE public.doctor_availability_slots IS '産業医・保健師の稼働日時スロット（面談予約制約用）';
COMMENT ON COLUMN public.doctor_availability_slots.doctor_id IS '産業医・保健師の employee_id';
COMMENT ON COLUMN public.doctor_availability_slots.day_of_week IS '曜日（0=日, 1=月, ..., 6=土）。繰り返しスロット時のみ使用';
COMMENT ON COLUMN public.doctor_availability_slots.specific_date IS '特定日。日付指定スロット時のみ使用';
COMMENT ON COLUMN public.doctor_availability_slots.start_time IS '稼働開始時刻';
COMMENT ON COLUMN public.doctor_availability_slots.end_time IS '稼働終了時刻';

-- -----------------------------------------------------------------------------
-- 2. インデックス
-- -----------------------------------------------------------------------------
CREATE INDEX idx_doctor_availability_slots_tenant_doctor
  ON public.doctor_availability_slots (tenant_id, doctor_id);

CREATE INDEX idx_doctor_availability_slots_doctor_specific
  ON public.doctor_availability_slots (doctor_id, specific_date)
  WHERE specific_date IS NOT NULL;

-- 繰り返しスロットの重複防止
CREATE UNIQUE INDEX idx_doctor_availability_slots_weekly_unique
  ON public.doctor_availability_slots (tenant_id, doctor_id, day_of_week, start_time, end_time)
  WHERE specific_date IS NULL;

-- 特定日スロットの重複防止
CREATE UNIQUE INDEX idx_doctor_availability_slots_specific_unique
  ON public.doctor_availability_slots (tenant_id, doctor_id, specific_date, start_time, end_time)
  WHERE specific_date IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 3. updated_at 自動更新トリガー
-- -----------------------------------------------------------------------------
CREATE TRIGGER trg_doctor_availability_slots_updated_at
  BEFORE UPDATE ON public.doctor_availability_slots
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- -----------------------------------------------------------------------------
-- 4. RLS（Row Level Security）設定
-- -----------------------------------------------------------------------------
ALTER TABLE public.doctor_availability_slots ENABLE ROW LEVEL SECURITY;

-- 4.1 産業医・保健師：フルアクセス（SELECT, INSERT, UPDATE, DELETE）
CREATE POLICY "doctor_availability_slots_doctor_nurse_all"
  ON public.doctor_availability_slots
  FOR ALL
  USING (
    tenant_id = public.current_tenant_id()
    AND public.current_employee_app_role() IN ('company_doctor', 'company_nurse')
  )
  WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND public.current_employee_app_role() IN ('company_doctor', 'company_nurse')
  );

-- 4.2 人事責任者・人事：参照のみ（稼働日時確認用）
CREATE POLICY "doctor_availability_slots_hr_select"
  ON public.doctor_availability_slots
  FOR SELECT
  USING (
    tenant_id = public.current_tenant_id()
    AND public.current_employee_app_role() IN ('hr', 'hr_manager')
  );

-- 4.3 SaaS管理者（supaUser）用バイパス
CREATE POLICY "doctor_availability_slots_supa_all"
  ON public.doctor_availability_slots
  USING (auth.uid() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999'::uuid)
  WITH CHECK (auth.uid() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999'::uuid);

-- -----------------------------------------------------------------------------
-- 5. 権限付与
-- -----------------------------------------------------------------------------
GRANT ALL ON TABLE public.doctor_availability_slots TO anon;
GRANT ALL ON TABLE public.doctor_availability_slots TO authenticated;
GRANT ALL ON TABLE public.doctor_availability_slots TO service_role;

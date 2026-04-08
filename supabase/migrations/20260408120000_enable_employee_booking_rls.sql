-- =============================================================================
-- 従業員による面談予約機能を有効化するための RLS ポリシー追加
-- =============================================================================

-- 1. 産業医稼働枠：従業員が参照できるようにする（カレンダー表示・予約枠選択用）
CREATE POLICY "doctor_availability_slots_employee_select"
  ON public.doctor_availability_slots
  FOR SELECT
  USING (
    tenant_id = public.current_tenant_id()
  );

-- 2. 面談記録：従業員が自分の記録を参照できるようにする（カレンダー表示用）
CREATE POLICY "stress_interview_records_employee_select_own"
  ON public.stress_interview_records
  FOR SELECT
  USING (
    tenant_id = public.current_tenant_id()
    AND interviewee_id = public.current_employee_id()
  );

-- 3. 面談記録：従業員が自分の予約を登録できるようにする（新規予約用）
CREATE POLICY "stress_interview_records_employee_insert_own"
  ON public.stress_interview_records
  FOR INSERT
  WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND interviewee_id = public.current_employee_id()
    AND status = 'scheduled'
  );

-- 4. 面談記録：従業員が自分の予約をキャンセル・変更できるようにする
CREATE POLICY "stress_interview_records_employee_update_own"
  ON public.stress_interview_records
  FOR UPDATE
  USING (
    tenant_id = public.current_tenant_id()
    AND interviewee_id = public.current_employee_id()
  )
  WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND interviewee_id = public.current_employee_id()
    AND status IN ('scheduled', 'cancelled')
  );

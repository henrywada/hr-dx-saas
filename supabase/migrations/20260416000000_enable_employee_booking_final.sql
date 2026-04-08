-- =============================================================================
-- 従業員による面談予約機能を有効化するための RLS ポリシー追加
-- =============================================================================

-- 1. 産業医稼働枠：従業員が参照できるようにする（カレンダー表示・予約枠選択用）
-- すでに 20260408120000 で追加されている想定ですが、不整合を防ぐため再確認
-- もし存在しない場合は以下が実行されます。
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'doctor_availability_slots' 
        AND policyname = 'doctor_availability_slots_employee_select'
    ) THEN
        CREATE POLICY "doctor_availability_slots_employee_select"
          ON public.doctor_availability_slots
          FOR SELECT
          USING (
            tenant_id = public.current_tenant_id()
          );
    END IF;
END
$$;

-- 2. 面談記録：自分の記録の参照
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'stress_interview_records' 
        AND policyname = 'stress_interview_records_employee_select_own'
    ) THEN
        CREATE POLICY "stress_interview_records_employee_select_own"
          ON public.stress_interview_records
          FOR SELECT
          USING (
            tenant_id = public.current_tenant_id()
            AND interviewee_id = public.current_employee_id()
          );
    END IF;
END
$$;

-- 3. 面談記録：自分の予約の登録
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'stress_interview_records' 
        AND policyname = 'stress_interview_records_employee_insert_own'
    ) THEN
        CREATE POLICY "stress_interview_records_employee_insert_own"
          ON public.stress_interview_records
          FOR INSERT
          WITH CHECK (
            tenant_id = public.current_tenant_id()
            AND interviewee_id = public.current_employee_id()
            AND status = 'scheduled'
          );
    END IF;
END
$$;

-- 4. 面談記録：自分の予約のキャンセル・変更
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'stress_interview_records' 
        AND policyname = 'stress_interview_records_employee_update_own'
    ) THEN
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
    END IF;
END
$$;

-- 5. app_role テーブルの参照権限（JOINクエリで必要）
-- 全認証ユーザーに参照権限を付与
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'app_role' 
        AND policyname = 'authenticated_select_app_role'
    ) THEN
        CREATE POLICY "authenticated_select_app_role"
          ON public.app_role
          FOR SELECT
          TO authenticated
          USING (true);
    END IF;
END
$$;

-- 産業医・保健師が面談準備のためにコンディション記録の生データを閲覧できるようにする例外ポリシー
-- (既存の condition_checkins_select_self ポリシーとは別に追加。本人以外への開示は
--  医療専門職ロールに限定し、PRDのWon't方針の例外として明示的に許可する)
CREATE POLICY "condition_checkins_select_doctor_nurse" ON public.condition_checkins
  FOR SELECT USING (
    tenant_id = current_tenant_id()
    AND current_employee_app_role() IN ('company_doctor', 'company_nurse')
  );

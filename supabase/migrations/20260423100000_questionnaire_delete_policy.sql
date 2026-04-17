-- questionnaires の削除ポリシーを draft に加えて closed も許可するよう更新
DROP POLICY IF EXISTS "questionnaires_delete" ON public.questionnaires;

CREATE POLICY "questionnaires_delete"
  ON public.questionnaires FOR DELETE TO authenticated
  USING (
    status IN ('draft', 'closed')
    AND (
      (creator_type = 'system' AND public.current_employee_app_role() = 'developer')
      OR (creator_type = 'tenant' AND tenant_id = public.current_tenant_id()
          AND public.current_employee_app_role() = ANY(ARRAY['hr', 'hr_manager', 'developer']))
    )
  );

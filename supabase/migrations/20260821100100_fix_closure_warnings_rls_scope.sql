-- closure_warnings の SELECT RLS を「本人 or 労務管理ロール」に限定する。
-- 既存の closure_warnings_tenant_select は tenant_id のみで employee_id のスコープが無く、
-- テナント内の任意の従業員が同僚の36協定超過警告（機微な労務データ）を直接
-- 閲覧できてしまう状態だった（/top 通知フィード Phase 2 のレビューで発見）。
-- health_check_records の self / staff 分離ポリシー（20260813120000）と同じ方針で是正する。
-- 労務管理ロールは /adm/labor-compliance の allowedRoles と揃える。

DROP POLICY IF EXISTS "closure_warnings_tenant_select" ON public.closure_warnings;

CREATE POLICY "closure_warnings_select_self_or_admin"
  ON public.closure_warnings FOR SELECT TO authenticated
  USING (
    tenant_id = public.current_tenant_id()
    AND (
      employee_id = public.current_employee_id()
      OR public.current_employee_app_role() = ANY (ARRAY['hr', 'hr_manager', 'tenant_admin', 'developer'])
    )
  );

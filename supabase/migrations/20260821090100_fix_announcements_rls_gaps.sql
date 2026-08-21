-- announcements の既存RLSの穴を修正する。
-- 1) SELECT: hr/hr_manager/developer が他人宛の個人お知らせ（産業医への健康アラート等）を無条件に
--    閲覧できてしまっていたのを廃止し、全社向け(recipient_employee_id IS NULL)か本人宛のみに限定する。
-- 2) INSERT/UPDATE/DELETE: ロール制限が一切無く一般従業員も書き込み可能だったのを、
--    hr/hr_manager/developer のみに制限する。
--    ドメイン機能からの個人宛システム通知（Kudos・コンディションアラート・健診面談推奨等）は
--    このポリシーの対象外とするため、別マイグレーションで SECURITY DEFINER の
--    post_system_announcement() RPC を新設し、該当箇所はそちらへ切り替える。

DROP POLICY IF EXISTS "announcements_tenant_select" ON public.announcements;
CREATE POLICY "announcements_tenant_select"
  ON public.announcements FOR SELECT TO authenticated
  USING (
    tenant_id = public.current_tenant_id()
    AND (
      recipient_employee_id IS NULL
      OR recipient_employee_id = public.current_employee_id()
    )
  );

DROP POLICY IF EXISTS "announcements_tenant_insert" ON public.announcements;
CREATE POLICY "announcements_tenant_insert"
  ON public.announcements FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND public.current_employee_app_role() = ANY (ARRAY['hr', 'hr_manager', 'developer'])
  );

DROP POLICY IF EXISTS "announcements_tenant_update" ON public.announcements;
CREATE POLICY "announcements_tenant_update"
  ON public.announcements FOR UPDATE TO authenticated
  USING (
    tenant_id = public.current_tenant_id()
    AND public.current_employee_app_role() = ANY (ARRAY['hr', 'hr_manager', 'developer'])
  );

DROP POLICY IF EXISTS "announcements_tenant_delete" ON public.announcements;
CREATE POLICY "announcements_tenant_delete"
  ON public.announcements FOR DELETE TO authenticated
  USING (
    tenant_id = public.current_tenant_id()
    AND public.current_employee_app_role() = ANY (ARRAY['hr', 'hr_manager', 'developer'])
  );

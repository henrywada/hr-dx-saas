-- K-S2: 個人宛お知らせ（Kudos 受信通知等）用カラム追加
-- recipient_employee_id が NULL の場合は従来どおり全社向け。

ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS recipient_employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE;

COMMENT ON COLUMN public.announcements.recipient_employee_id IS
  '個人宛お知らせの受信者従業員ID（NULL=全社向け）';

CREATE INDEX IF NOT EXISTS idx_announcements_recipient_employee
  ON public.announcements (recipient_employee_id)
  WHERE recipient_employee_id IS NOT NULL;

-- 閲覧ポリシー: 全社向け or 自分宛 or HR 系ロールは全件閲覧可
DROP POLICY IF EXISTS "announcements_tenant_select" ON public.announcements;

CREATE POLICY "announcements_tenant_select"
  ON public.announcements FOR SELECT TO authenticated
  USING (
    tenant_id = public.current_tenant_id()
    AND (
      recipient_employee_id IS NULL
      OR recipient_employee_id = public.current_employee_id()
      OR public.current_employee_app_role() = ANY (
        ARRAY['hr', 'hr_manager', 'developer']
      )
    )
  );

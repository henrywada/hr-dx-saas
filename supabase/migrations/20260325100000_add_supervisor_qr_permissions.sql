-- 監督者が QR 表示を許可する従業員（マルチテナント + RLS）
-- 既存データを壊さないため CREATE TABLE IF NOT EXISTS のみ（DROP/TRUNCATE なし）

CREATE TABLE IF NOT EXISTS public.supervisor_qr_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  supervisor_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  can_display boolean NOT NULL DEFAULT true,
  scope text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT supervisor_qr_permissions_tenant_supervisor_employee_key UNIQUE (tenant_id, supervisor_user_id, employee_user_id)
);

COMMENT ON TABLE public.supervisor_qr_permissions IS '監督者が QR 表示を許可した従業員（テナント単位）';
COMMENT ON COLUMN public.supervisor_qr_permissions.scope IS '任意タグ（例: punch_in / punch_out / all）';
COMMENT ON COLUMN public.supervisor_qr_permissions.can_display IS 'QR 表示を許可するか';

-- テーブルだけ先行作成された環境向け: ユニーク制約の冪等追加
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'supervisor_qr_permissions'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class rel ON rel.oid = c.conrelid
    JOIN pg_namespace ns ON ns.oid = rel.relnamespace
    WHERE ns.nspname = 'public'
      AND rel.relname = 'supervisor_qr_permissions'
      AND c.conname = 'supervisor_qr_permissions_tenant_supervisor_employee_key'
  ) THEN
    ALTER TABLE public.supervisor_qr_permissions
      ADD CONSTRAINT supervisor_qr_permissions_tenant_supervisor_employee_key
      UNIQUE (tenant_id, supervisor_user_id, employee_user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_supervisor_qr_permissions_tenant_supervisor
  ON public.supervisor_qr_permissions(tenant_id, supervisor_user_id);

CREATE INDEX IF NOT EXISTS idx_supervisor_qr_permissions_tenant_employee
  ON public.supervisor_qr_permissions(tenant_id, employee_user_id);

DROP TRIGGER IF EXISTS set_supervisor_qr_permissions_updated_at ON public.supervisor_qr_permissions;

CREATE TRIGGER set_supervisor_qr_permissions_updated_at
  BEFORE UPDATE ON public.supervisor_qr_permissions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.supervisor_qr_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "supervisor_qr_permissions_tenant_select"
  ON public.supervisor_qr_permissions FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());

CREATE POLICY "supervisor_qr_permissions_supervisor_insert"
  ON public.supervisor_qr_permissions FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND supervisor_user_id = auth.uid()
  );

CREATE POLICY "supervisor_qr_permissions_supervisor_update"
  ON public.supervisor_qr_permissions FOR UPDATE TO authenticated
  USING (
    tenant_id = public.current_tenant_id()
    AND supervisor_user_id = auth.uid()
  )
  WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND supervisor_user_id = auth.uid()
  );

CREATE POLICY "supervisor_qr_permissions_supervisor_delete"
  ON public.supervisor_qr_permissions FOR DELETE TO authenticated
  USING (
    tenant_id = public.current_tenant_id()
    AND supervisor_user_id = auth.uid()
  );

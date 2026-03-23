-- QR 打刻セッション・スキャン・監査ログ（マルチテナント + RLS）
-- 既存データを壊さないため CREATE TABLE IF NOT EXISTS のみ（DROP/TRUNCATE なし）

-- =============================================================================
-- 1. qr_sessions（QR セッション）
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.qr_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  supervisor_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  purpose text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  nonce text NOT NULL,
  code text,
  max_uses int NOT NULL DEFAULT 1,
  uses int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb DEFAULT '{}'::jsonb
);

COMMENT ON TABLE public.qr_sessions IS 'QR 打刻用セッション（監督者が発行、purpose は punch_in / punch_out 等）';
COMMENT ON COLUMN public.qr_sessions.metadata IS '現場IDなど任意データ';

-- nonce のテナント内一意（再利用・なりすまし防止）
CREATE UNIQUE INDEX IF NOT EXISTS idx_qr_sessions_tenant_nonce ON public.qr_sessions(tenant_id, nonce);

CREATE INDEX IF NOT EXISTS idx_qr_sessions_tenant_supervisor ON public.qr_sessions(tenant_id, supervisor_user_id);
CREATE INDEX IF NOT EXISTS idx_qr_sessions_expires_at ON public.qr_sessions(expires_at);

ALTER TABLE public.qr_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "qr_sessions_tenant_select"
  ON public.qr_sessions FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());

CREATE POLICY "qr_sessions_tenant_insert"
  ON public.qr_sessions FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY "qr_sessions_tenant_update"
  ON public.qr_sessions FOR UPDATE TO authenticated
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY "qr_sessions_tenant_delete"
  ON public.qr_sessions FOR DELETE TO authenticated
  USING (tenant_id = public.current_tenant_id());

-- =============================================================================
-- 2. qr_session_scans（スキャン記録）
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.qr_session_scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES public.qr_sessions(id) ON DELETE CASCADE,
  employee_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scanned_at timestamptz NOT NULL DEFAULT now(),
  device_info jsonb,
  location jsonb,
  proximity jsonb,
  photo_url text,
  photo_hash text,
  supervisor_confirmed boolean DEFAULT false,
  confirm_method text,
  result text DEFAULT 'pending',
  audit jsonb DEFAULT '{}'::jsonb
);

COMMENT ON TABLE public.qr_session_scans IS 'QR スキャン1件ごとの記録（デバイス・位置・承認結果）';

CREATE INDEX IF NOT EXISTS idx_qr_scans_session_id ON public.qr_session_scans(session_id);
CREATE INDEX IF NOT EXISTS idx_qr_scans_employee ON public.qr_session_scans(tenant_id, employee_user_id);
CREATE INDEX IF NOT EXISTS idx_qr_scans_scanned_at ON public.qr_session_scans(scanned_at);

ALTER TABLE public.qr_session_scans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "qr_session_scans_tenant_select"
  ON public.qr_session_scans FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());

CREATE POLICY "qr_session_scans_tenant_insert"
  ON public.qr_session_scans FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY "qr_session_scans_tenant_update"
  ON public.qr_session_scans FOR UPDATE TO authenticated
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY "qr_session_scans_tenant_delete"
  ON public.qr_session_scans FOR DELETE TO authenticated
  USING (tenant_id = public.current_tenant_id());

-- =============================================================================
-- 3. qr_audit_logs（監査ログ）
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.qr_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  related_table text NOT NULL,
  related_id uuid,
  action text NOT NULL,
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.qr_audit_logs IS 'QR 打刻まわりの監査ログ';

CREATE INDEX IF NOT EXISTS idx_qr_audit_tenant ON public.qr_audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_qr_audit_created_at ON public.qr_audit_logs(created_at);

ALTER TABLE public.qr_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "qr_audit_logs_tenant_select"
  ON public.qr_audit_logs FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());

CREATE POLICY "qr_audit_logs_tenant_insert"
  ON public.qr_audit_logs FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY "qr_audit_logs_tenant_update"
  ON public.qr_audit_logs FOR UPDATE TO authenticated
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY "qr_audit_logs_tenant_delete"
  ON public.qr_audit_logs FOR DELETE TO authenticated
  USING (tenant_id = public.current_tenant_id());

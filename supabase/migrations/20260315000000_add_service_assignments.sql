-- サービス対象者管理テーブル
-- service_assignments: サービスの親定義
-- service_assignments_users: ユーザー紐付け

-- =============================================================================
-- service_assignments（サービスの親定義）
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.service_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  service_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.service_assignments IS 'サービスの親定義（テナント単位）';
COMMENT ON COLUMN public.service_assignments.service_type IS 'サービス種別（例: pulse_survey, stress_check）';

CREATE INDEX idx_service_assignments_tenant ON public.service_assignments(tenant_id);

ALTER TABLE public.service_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_assignments_tenant_select"
  ON public.service_assignments FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());

CREATE POLICY "service_assignments_tenant_insert"
  ON public.service_assignments FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY "service_assignments_tenant_update"
  ON public.service_assignments FOR UPDATE TO authenticated
  USING (tenant_id = public.current_tenant_id());

CREATE POLICY "service_assignments_tenant_delete"
  ON public.service_assignments FOR DELETE TO authenticated
  USING (tenant_id = public.current_tenant_id());

-- =============================================================================
-- service_assignments_users（ユーザー紐付け）
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.service_assignments_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  service_assignment_id uuid NOT NULL REFERENCES public.service_assignments(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  is_available boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (service_assignment_id, employee_id)
);

COMMENT ON TABLE public.service_assignments_users IS 'サービス対象ユーザー紐付け';
COMMENT ON COLUMN public.service_assignments_users.is_available IS '有効/無効フラグ';

CREATE INDEX idx_service_assignments_users_tenant ON public.service_assignments_users(tenant_id);
CREATE INDEX idx_service_assignments_users_assignment ON public.service_assignments_users(service_assignment_id);
CREATE INDEX idx_service_assignments_users_employee ON public.service_assignments_users(employee_id);

ALTER TABLE public.service_assignments_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_assignments_users_tenant_select"
  ON public.service_assignments_users FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());

CREATE POLICY "service_assignments_users_tenant_insert"
  ON public.service_assignments_users FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY "service_assignments_users_tenant_update"
  ON public.service_assignments_users FOR UPDATE TO authenticated
  USING (tenant_id = public.current_tenant_id());

CREATE POLICY "service_assignments_users_tenant_delete"
  ON public.service_assignments_users FOR DELETE TO authenticated
  USING (tenant_id = public.current_tenant_id());

-- updated_at 自動更新
CREATE TRIGGER set_service_assignments_updated_at
  BEFORE UPDATE ON public.service_assignments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_service_assignments_users_updated_at
  BEFORE UPDATE ON public.service_assignments_users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================================================
-- RPC: 対象ユーザー同期
-- app_role が test, developer, company_doctor 以外の従業員を
-- service_assignments_users に未登録分のみ INSERT
-- =============================================================================
CREATE OR REPLACE FUNCTION public.sync_service_assignment_users(p_service_assignment_id uuid)
RETURNS TABLE(inserted_count int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid;
  v_inserted int := 0;
BEGIN
  -- サービス割当の存在確認と tenant_id 取得
  SELECT tenant_id INTO v_tenant_id
  FROM public.service_assignments
  WHERE id = p_service_assignment_id;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'service_assignment not found: %', p_service_assignment_id;
  END IF;

  -- current_tenant_id と一致するか検証（マルチテナント分離）
  IF v_tenant_id != public.current_tenant_id() THEN
    RAISE EXCEPTION 'tenant_id mismatch';
  END IF;

  -- 対象従業員（app_role が test, developer, company_doctor 以外）のうち
  -- 未登録のものを INSERT
  WITH eligible_employees AS (
    SELECT e.id AS employee_id
    FROM public.employees e
    JOIN public.app_role ar ON ar.id = e.app_role_id
    WHERE e.tenant_id = v_tenant_id
      AND ar.app_role IS NOT NULL
      AND ar.app_role NOT IN ('test', 'developer', 'company_doctor')
  ),
  existing AS (
    SELECT employee_id
    FROM public.service_assignments_users
    WHERE service_assignment_id = p_service_assignment_id
  ),
  to_insert AS (
    SELECT ee.employee_id
    FROM eligible_employees ee
    WHERE ee.employee_id NOT IN (SELECT employee_id FROM existing)
  )
  INSERT INTO public.service_assignments_users (tenant_id, service_assignment_id, employee_id, is_available)
  SELECT v_tenant_id, p_service_assignment_id, ti.employee_id, true
  FROM to_insert ti;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  RETURN QUERY SELECT v_inserted;
END;
$$;

COMMENT ON FUNCTION public.sync_service_assignment_users(uuid) IS
  'サービス割当の対象ユーザーを同期（test/developer/company_doctor 以外の従業員を未登録分のみ追加）';

GRANT EXECUTE ON FUNCTION public.sync_service_assignment_users(uuid) TO authenticated;

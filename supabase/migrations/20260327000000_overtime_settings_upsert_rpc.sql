-- クライアントの table upsert が INSERT RLS で失敗する環境向けの対策（データ削除なし）
-- A) 直接 INSERT も通るようポリシー・権限を冪等で保証（26231000 未適用でも可）
DROP POLICY IF EXISTS "overtime_settings_tenant_insert" ON public.overtime_settings;
CREATE POLICY "overtime_settings_tenant_insert"
  ON public.overtime_settings FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.current_tenant_id());

GRANT SELECT, INSERT, UPDATE ON TABLE public.overtime_settings TO authenticated;

-- B) current_tenant_id() でテナント固定の upsert RPC（ポリシー未配布でも保存可能）

CREATE OR REPLACE FUNCTION public.upsert_overtime_settings(
  p_monthly_limit_hours integer,
  p_monthly_warning_hours integer,
  p_annual_limit_hours integer,
  p_average_limit_hours integer
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant uuid;
  v_id uuid;
BEGIN
  v_tenant := public.current_tenant_id();
  IF v_tenant IS NULL THEN
    RAISE EXCEPTION 'テナントを特定できません（従業員との紐付けを確認してください）';
  END IF;

  INSERT INTO public.overtime_settings (
    tenant_id,
    monthly_limit_hours,
    monthly_warning_hours,
    annual_limit_hours,
    average_limit_hours
  ) VALUES (
    v_tenant,
    p_monthly_limit_hours,
    p_monthly_warning_hours,
    p_annual_limit_hours,
    p_average_limit_hours
  )
  ON CONFLICT (tenant_id) DO UPDATE SET
    monthly_limit_hours = EXCLUDED.monthly_limit_hours,
    monthly_warning_hours = EXCLUDED.monthly_warning_hours,
    annual_limit_hours = EXCLUDED.annual_limit_hours,
    average_limit_hours = EXCLUDED.average_limit_hours,
    updated_at = now()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

COMMENT ON FUNCTION public.upsert_overtime_settings(integer, integer, integer, integer) IS
  'ログインユーザーの current_tenant_id に対応する overtime_settings を upsert';

ALTER FUNCTION public.upsert_overtime_settings(integer, integer, integer, integer) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.upsert_overtime_settings(integer, integer, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_overtime_settings(integer, integer, integer, integer) TO authenticated;

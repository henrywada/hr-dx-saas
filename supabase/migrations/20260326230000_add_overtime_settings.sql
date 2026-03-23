-- テナントごとの残業閾値設定（既存データを壊さない: CREATE のみ、DROP/TRUNCATE なし）

CREATE TABLE IF NOT EXISTS public.overtime_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  monthly_limit_hours integer NOT NULL DEFAULT 45,
  monthly_warning_hours integer NOT NULL DEFAULT 40,
  annual_limit_hours integer NOT NULL DEFAULT 360,
  average_limit_hours integer NOT NULL DEFAULT 80,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT overtime_settings_tenant_id_key UNIQUE (tenant_id)
);

COMMENT ON TABLE public.overtime_settings IS 'テナント単位の残業閾値（月間上限・警告・年間・2-6ヶ月平均）';
COMMENT ON COLUMN public.overtime_settings.monthly_limit_hours IS '月間上限（時間）';
COMMENT ON COLUMN public.overtime_settings.monthly_warning_hours IS '警告を出す時間（月間・時間）';
COMMENT ON COLUMN public.overtime_settings.annual_limit_hours IS '年間上限（時間）';
COMMENT ON COLUMN public.overtime_settings.average_limit_hours IS '2-6ヶ月平均上限（時間）';

CREATE INDEX IF NOT EXISTS idx_overtime_settings_tenant_id ON public.overtime_settings(tenant_id);

DROP TRIGGER IF EXISTS set_overtime_settings_updated_at ON public.overtime_settings;

CREATE TRIGGER set_overtime_settings_updated_at
  BEFORE UPDATE ON public.overtime_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.overtime_settings ENABLE ROW LEVEL SECURITY;

-- 参照・更新のみ（INSERT は service_role 等の初期投入用。authenticated には INSERT ポリシーを付けない）
CREATE POLICY "overtime_settings_tenant_select"
  ON public.overtime_settings FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());

CREATE POLICY "overtime_settings_tenant_update"
  ON public.overtime_settings FOR UPDATE TO authenticated
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

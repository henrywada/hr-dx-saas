-- upsert 時の INSERT を authenticated に許可（自テナントのみ）。既存行の削除・変更なし。
-- 冪等: 再適用・Studio 手動実行でも重複エラーにしない
DROP POLICY IF EXISTS "overtime_settings_tenant_insert" ON public.overtime_settings;
CREATE POLICY "overtime_settings_tenant_insert"
  ON public.overtime_settings FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.current_tenant_id());

GRANT SELECT, INSERT, UPDATE ON TABLE public.overtime_settings TO authenticated;

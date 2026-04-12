-- 冪等: 未作成環境で tenant_portal_settings を確実に用意する（前段マイグレーション未適用時の追補）
-- DROP/TRUNCATE なし。既存オブジェクトは上書きまたはスキップ。

CREATE TABLE IF NOT EXISTS public.tenant_portal_settings (
  tenant_id uuid PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  hr_inquiry_email text NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.tenant_portal_settings IS 'テナントのポータル基本設定（お問合せ先メール等）';
COMMENT ON COLUMN public.tenant_portal_settings.hr_inquiry_email IS '人事へのお問合せメール宛先。NULL のときサーバー環境変数のフォールバックを使用';

DROP TRIGGER IF EXISTS set_tenant_portal_settings_updated_at ON public.tenant_portal_settings;

CREATE TRIGGER set_tenant_portal_settings_updated_at
  BEFORE UPDATE ON public.tenant_portal_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.tenant_portal_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_portal_settings_tenant_select" ON public.tenant_portal_settings;
DROP POLICY IF EXISTS "tenant_portal_settings_tenant_insert" ON public.tenant_portal_settings;
DROP POLICY IF EXISTS "tenant_portal_settings_tenant_update" ON public.tenant_portal_settings;

CREATE POLICY "tenant_portal_settings_tenant_select"
  ON public.tenant_portal_settings FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());

CREATE POLICY "tenant_portal_settings_tenant_insert"
  ON public.tenant_portal_settings FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY "tenant_portal_settings_tenant_update"
  ON public.tenant_portal_settings FOR UPDATE TO authenticated
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

GRANT SELECT, INSERT, UPDATE ON TABLE public.tenant_portal_settings TO authenticated;

CREATE OR REPLACE FUNCTION public.upsert_tenant_portal_settings(
  p_hr_inquiry_email text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant uuid;
  v_out uuid;
BEGIN
  v_tenant := public.current_tenant_id();
  IF v_tenant IS NULL THEN
    RAISE EXCEPTION 'テナントを特定できません（従業員との紐付けを確認してください）';
  END IF;

  INSERT INTO public.tenant_portal_settings (
    tenant_id,
    hr_inquiry_email
  ) VALUES (
    v_tenant,
    NULLIF(trim(COALESCE(p_hr_inquiry_email, '')), '')
  )
  ON CONFLICT (tenant_id) DO UPDATE SET
    hr_inquiry_email = EXCLUDED.hr_inquiry_email,
    updated_at = now()
  RETURNING tenant_id INTO v_out;

  RETURN v_out;
END;
$$;

COMMENT ON FUNCTION public.upsert_tenant_portal_settings(text) IS
  'ログインユーザーの current_tenant_id に対応する tenant_portal_settings を upsert';

ALTER FUNCTION public.upsert_tenant_portal_settings(text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.upsert_tenant_portal_settings(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_tenant_portal_settings(text) TO authenticated;

INSERT INTO public.service (
  id, service_category_id, name, category, title, description, sort_order,
  route_path, app_role_group_id, app_role_group_uuid, target_audience, release_status
)
VALUES (
  'e7f8a9b0-c1d2-4e3f-5a6b-7c8d9e0f1a2b',
  '35c69c7f-6580-4250-a125-d15c28ead6b2',
  'ポータル基本設定',
  NULL,
  '基本設定',
  '人事へのお問合せメールの宛先など、テナント単位の基本設定を行います。',
  95,
  '/settings',
  NULL,
  NULL,
  'adm',
  '公開'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.app_role_service (id, app_role_id, service_id)
SELECT gen_random_uuid(), r.app_role_id, 'e7f8a9b0-c1d2-4e3f-5a6b-7c8d9e0f1a2b'::uuid
FROM (VALUES
  ('03c94882-88b0-4937-887b-c3733ab21028'::uuid),
  ('25d560ff-0166-49a5-b29c-24711664bd6d'::uuid),
  ('74f8e05b-c99d-45ee-b368-fdbe35ee0e52'::uuid),
  ('c50ebd55-3466-43dc-a702-5d8321908d69'::uuid),
  ('f422469d-c1e0-4a10-ac6c-4b656b4fec64'::uuid)
) AS r(app_role_id)
WHERE EXISTS (SELECT 1 FROM public.app_role ar WHERE ar.id = r.app_role_id)
  AND NOT EXISTS (
    SELECT 1 FROM public.app_role_service ars
    WHERE ars.app_role_id = r.app_role_id
      AND ars.service_id = 'e7f8a9b0-c1d2-4e3f-5a6b-7c8d9e0f1a2b'::uuid
  );

INSERT INTO public.tenant_service (tenant_id, service_id)
SELECT t.id, 'e7f8a9b0-c1d2-4e3f-5a6b-7c8d9e0f1a2b'::uuid
FROM public.tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM public.tenant_service ts
  WHERE ts.tenant_id = t.id AND ts.service_id = 'e7f8a9b0-c1d2-4e3f-5a6b-7c8d9e0f1a2b'::uuid
);

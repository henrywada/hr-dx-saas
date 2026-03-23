-- =============================================================================
-- 実施対象者管理 — サイドバーサービス追加
-- 管理：基本登録 カテゴリに「実施対象者管理」を追加
-- =============================================================================

-- 1. サービス「実施対象者管理」を追加（管理：基本登録 カテゴリ）
-- service_category_id: 35c69c7f = 管理：基本登録
INSERT INTO public.service (id, service_category_id, name, category, title, description, sort_order, route_path, app_role_group_id, app_role_group_uuid, target_audience, release_status)
VALUES (
  'd8e9f0a1-b2c3-4d5e-6f7a-8b9c0d1e2f3a',
  '35c69c7f-6580-4250-a125-d15c28ead6b2',
  '実施対象者管理',
  NULL,
  '基本設定',
  'ストレスチェック・パルスサーベイ等の実施枠ごとに対象者を管理。company_doctor は常に対象者外。',
  250,
  '/adm/program-targets',
  NULL,
  NULL,
  'adm',
  '公開'
)
ON CONFLICT (id) DO NOTHING;

-- 2. app_role_service: hr, hr_manager に紐づけ（組織の登録・従業員の登録と同様）
-- app_role id: hr=03c94882-88b0-4937-887b-c3733ab21028, hr_manager=74f8e05b-c99d-45ee-b368-fdbe35ee0e52
INSERT INTO public.app_role_service (id, app_role_id, service_id)
SELECT gen_random_uuid(), r.app_role_id, 'd8e9f0a1-b2c3-4d5e-6f7a-8b9c0d1e2f3a'
FROM (VALUES
  ('03c94882-88b0-4937-887b-c3733ab21028'::uuid),
  ('74f8e05b-c99d-45ee-b368-fdbe35ee0e52'::uuid)
) AS r(app_role_id)
WHERE NOT EXISTS (
  SELECT 1 FROM public.app_role_service ars
  WHERE ars.app_role_id = r.app_role_id AND ars.service_id = 'd8e9f0a1-b2c3-4d5e-6f7a-8b9c0d1e2f3a'
);

-- 3. 組織の登録（divisions）を契約しているテナントに新サービスを追加
INSERT INTO public.tenant_service (tenant_id, service_id)
SELECT DISTINCT ts.tenant_id, 'd8e9f0a1-b2c3-4d5e-6f7a-8b9c0d1e2f3a'::uuid
FROM public.tenant_service ts
WHERE ts.service_id = 'ee5e31ef-60da-4dc2-a200-de50db9009fd'
  AND NOT EXISTS (
    SELECT 1 FROM public.tenant_service t2
    WHERE t2.tenant_id = ts.tenant_id AND t2.service_id = 'd8e9f0a1-b2c3-4d5e-6f7a-8b9c0d1e2f3a'::uuid
  );

-- 4. 従業員の登録（employees）を契約しているテナントにも追加（重複はスキップ）
INSERT INTO public.tenant_service (tenant_id, service_id)
SELECT DISTINCT ts.tenant_id, 'd8e9f0a1-b2c3-4d5e-6f7a-8b9c0d1e2f3a'::uuid
FROM public.tenant_service ts
WHERE ts.service_id = '3a5034ba-06dc-4157-b1bd-351d4bc5c01f'
  AND NOT EXISTS (
    SELECT 1 FROM public.tenant_service t2
    WHERE t2.tenant_id = ts.tenant_id AND t2.service_id = 'd8e9f0a1-b2c3-4d5e-6f7a-8b9c0d1e2f3a'::uuid
  );

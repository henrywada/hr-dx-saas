-- =============================================================================
-- AI職場改善提案エージェント — サイドバーサービス追加
-- =============================================================================
-- 管理：組織健康度 カテゴリに「AI職場改善提案」を追加
-- 集団分析または産業医面談を契約しているテナントに自動付与
-- =============================================================================

-- 0. マイグレーションが参照する service_category を事前登録（seed 依存を解消）
INSERT INTO public.service_category (id, sort_order, name, description, release_status)
VALUES
  ('2c64738f-bee1-458d-afae-67033faeceb0', 300, '管理：組織健康度', NULL, NULL),
  ('35c69c7f-6580-4250-a125-d15c28ead6b2', 900, '管理：基本登録', '', 'released')
ON CONFLICT (id) DO NOTHING;

-- 1. サービス「AI職場改善提案」を追加（管理：組織健康度 カテゴリ）
INSERT INTO public.service (id, service_category_id, name, category, title, description, sort_order, route_path, app_role_group_id, app_role_group_uuid, target_audience, release_status)
VALUES (
  'c8d9e0f1-a2b3-4c5d-6e7f-8a9b0c1d2e3f',
  '2c64738f-bee1-458d-afae-67033faeceb0',
  'AI職場改善提案',
  NULL,
  '第8章準拠｜集団分析からAI提案',
  'ストレスチェック集団分析結果をAIが読み、具体的な職場改善提案を3件生成。即実行登録から3ヶ月後フォロー測定まで一気通貫で管理。',
  350,
  '/adm/ai-workplace-improvement',
  NULL,
  NULL,
  'adm',
  '公開'
)
ON CONFLICT (id) DO NOTHING;

-- 2. app_role_service: hr, hr_manager, company_doctor, company_nurse, hsc に紐づけ
-- app_role id: hr=03c94882-88b0-4937-887b-c3733ab21028, hr_manager=74f8e05b-c99d-45ee-b368-fdbe35ee0e52,
-- company_doctor=7f8a303e-3b13-4fac-a0f0-6716b44a5711, company_nurse=bc2f9ef0-1ddc-408a-ba9f-93cd26955f81,
-- hsc=b239a055-8175-43bc-acae-a7d44dff75d5
INSERT INTO public.app_role_service (id, app_role_id, service_id)
SELECT gen_random_uuid(), r.app_role_id, 'c8d9e0f1-a2b3-4c5d-6e7f-8a9b0c1d2e3f'::uuid
FROM (VALUES
  ('03c94882-88b0-4937-887b-c3733ab21028'::uuid),
  ('74f8e05b-c99d-45ee-b368-fdbe35ee0e52'::uuid),
  ('7f8a303e-3b13-4fac-a0f0-6716b44a5711'::uuid),
  ('bc2f9ef0-1ddc-408a-ba9f-93cd26955f81'::uuid),
  ('b239a055-8175-43bc-acae-a7d44dff75d5'::uuid)
) AS r(app_role_id)
WHERE NOT EXISTS (
  SELECT 1 FROM public.app_role_service ars
  WHERE ars.app_role_id = r.app_role_id AND ars.service_id = 'c8d9e0f1-a2b3-4c5d-6e7f-8a9b0c1d2e3f'::uuid
);

-- 3. 集団分析を契約しているテナントに新サービスを追加
INSERT INTO public.tenant_service (tenant_id, service_id)
SELECT DISTINCT ts.tenant_id, 'c8d9e0f1-a2b3-4c5d-6e7f-8a9b0c1d2e3f'::uuid
FROM public.tenant_service ts
WHERE ts.service_id = 'ae6a59be-b368-4236-b1bc-4c2a7aaf034c'::uuid
  AND NOT EXISTS (
    SELECT 1 FROM public.tenant_service t2
    WHERE t2.tenant_id = ts.tenant_id AND t2.service_id = 'c8d9e0f1-a2b3-4c5d-6e7f-8a9b0c1d2e3f'::uuid
  );

-- 4. 産業医面談サポートを契約しているテナントにも追加（集団分析と重複する場合はスキップ）
INSERT INTO public.tenant_service (tenant_id, service_id)
SELECT DISTINCT ts.tenant_id, 'c8d9e0f1-a2b3-4c5d-6e7f-8a9b0c1d2e3f'::uuid
FROM public.tenant_service ts
WHERE ts.service_id = '6ca44518-71ee-4fb3-a520-43509c317f8a'::uuid
  AND NOT EXISTS (
    SELECT 1 FROM public.tenant_service t2
    WHERE t2.tenant_id = ts.tenant_id AND t2.service_id = 'c8d9e0f1-a2b3-4c5d-6e7f-8a9b0c1d2e3f'::uuid
  );

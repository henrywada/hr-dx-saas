-- NEW-3 採用ブランディング支援 — サイドバーサービス追加
-- 「管理：採用支援」カテゴリに「採用ブランディング支援」を追加
-- job-positions サービス（AI求人票作成）を契約しているテナントに自動付与

-- 1. サービス「採用ブランディング支援」を追加（管理：採用支援 カテゴリ）
INSERT INTO public.service (id, service_category_id, name, category, title, description, sort_order, route_path, app_role_group_id, app_role_group_uuid, target_audience, release_status)
VALUES (
  'd1e2f3a4-b5c6-7d8e-9f0a-1b2c3d4e5f6a',
  '2f310cc9-454d-4032-8e01-25a493a0a203',
  '採用ブランディング支援',
  NULL,
  '✨③ AI媒体別求人票ブランディング',
  '求人票をIndeed・LinkedIn・ハローワーク等の媒体向けに最適化。AIが会社の差別化ポイントを分析し、応募率を高める求人票を自動生成します。',
  55,
  '/adm/job-branding',
  NULL,
  NULL,
  'adm',
  '公開'
)
ON CONFLICT (id) DO NOTHING;

-- 2. job-positions サービスを契約しているテナントに新サービスを追加
INSERT INTO public.tenant_service (tenant_id, service_id)
SELECT DISTINCT ts.tenant_id, 'd1e2f3a4-b5c6-7d8e-9f0a-1b2c3d4e5f6a'::uuid
FROM public.tenant_service ts
WHERE ts.service_id = 'e456353b-4f4e-42e7-b2c0-595b2a844c72'::uuid
  AND NOT EXISTS (
    SELECT 1 FROM public.tenant_service t2
    WHERE t2.tenant_id = ts.tenant_id
      AND t2.service_id = 'd1e2f3a4-b5c6-7d8e-9f0a-1b2c3d4e5f6a'::uuid
  );

-- =============================================================================
-- 産業医・保健師専用サイドバーカテゴリ・サービス追加
-- 計画 Phase 7: サイドバー「産業医・保健師」専用セクション
-- =============================================================================

-- 1. サービスカテゴリ「産業医・保健師」を追加
INSERT INTO public.service_category (id, sort_order, name, description, release_status)
VALUES (
  'a8b7c6d5-e4f3-8291-bcde-f23456789012',
  250,
  '産業医・保健師',
  '産業医・保健師専用の高ストレス者フォロー管理',
  'released'
)
ON CONFLICT (id) DO NOTHING;

-- 2. サービス「高ストレス者フォロー管理」を追加（産業医・保健師専用）
INSERT INTO public.service (id, service_category_id, name, category, title, description, sort_order, route_path, app_role_group_id, app_role_group_uuid, target_audience, release_status)
VALUES (
  'b9c8d7e6-f5a4-9302-cdef-034567890123',
  'a8b7c6d5-e4f3-8291-bcde-f23456789012',
  '高ストレス者フォロー管理',
  NULL,
  '第7章準拠｜面接指導・就業措置記録',
  '高ストレス者への面接予約・実施記録・就業措置を匿名で管理。産業医・保健師専用のフォローアップ画面です。',
  100,
  '/adm/high-stress-followup',
  NULL,
  NULL,
  'adm',
  '公開'
)
ON CONFLICT (id) DO NOTHING;

-- 3. app_role_service: company_doctor, company_nurse に紐づけ
-- app_role id: company_doctor = 7f8a303e-3b13-4fac-a0f0-6716b44a5711, company_nurse = bc2f9ef0-1ddc-408a-ba9f-93cd26955f81
INSERT INTO public.app_role_service (id, app_role_id, service_id)
VALUES
  (gen_random_uuid(), '7f8a303e-3b13-4fac-a0f0-6716b44a5711', 'b9c8d7e6-f5a4-9302-cdef-034567890123'),
  (gen_random_uuid(), 'bc2f9ef0-1ddc-408a-ba9f-93cd26955f81', 'b9c8d7e6-f5a4-9302-cdef-034567890123');

-- 4. 既に「産業医面談サポート機能」を契約しているテナントに、新サービスも追加
INSERT INTO public.tenant_service (tenant_id, service_id)
SELECT DISTINCT ts.tenant_id, 'b9c8d7e6-f5a4-9302-cdef-034567890123'::uuid
FROM public.tenant_service ts
WHERE ts.service_id = '6ca44518-71ee-4fb3-a520-43509c317f8a'::uuid
  AND NOT EXISTS (
    SELECT 1 FROM public.tenant_service t2
    WHERE t2.tenant_id = ts.tenant_id AND t2.service_id = 'b9c8d7e6-f5a4-9302-cdef-034567890123'::uuid
  );

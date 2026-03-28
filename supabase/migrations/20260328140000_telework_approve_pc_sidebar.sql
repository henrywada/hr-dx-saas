-- テレワーク端末承認（人事）— subMenu 用 service + tenant_service
-- 既存「テレワーク端末ペアリング」の説明を登録申請中心に更新

UPDATE public.service
SET description = 'テレワーク用 PC の登録申請（人事による承認は「テレワーク端末承認」へ）'
WHERE id = 'b7c8d9e0-f1a2-4b3c-9d8e-7f6e5d4c3b2a';

INSERT INTO public.service (id, service_category_id, name, category, title, description, sort_order, route_path, app_role_group_id, app_role_group_uuid, target_audience, release_status)
VALUES (
  'a1b2c3d4-e5f6-47a8-b9c0-d1e2f3a4b5c6',
  '35c69c7f-6580-4250-a125-d15c28ead6b2',
  'テレワーク端末承認（人事）',
  NULL,
  '勤怠・端末',
  'テレワーク用 PC の登録申請の承認・拒否と承認済み一覧',
  266,
  '/adm/approve_pc',
  NULL,
  NULL,
  'adm',
  '公開'
)
ON CONFLICT (id) DO NOTHING;

-- テレワーク端末ペアリングと同じテナントに付与
INSERT INTO public.tenant_service (tenant_id, service_id)
SELECT DISTINCT ts.tenant_id, 'a1b2c3d4-e5f6-47a8-b9c0-d1e2f3a4b5c6'::uuid
FROM public.tenant_service ts
WHERE ts.service_id = 'b7c8d9e0-f1a2-4b3c-9d8e-7f6e5d4c3b2a'::uuid
  AND NOT EXISTS (
    SELECT 1 FROM public.tenant_service t2
    WHERE t2.tenant_id = ts.tenant_id AND t2.service_id = 'a1b2c3d4-e5f6-47a8-b9c0-d1e2f3a4b5c6'::uuid
  );

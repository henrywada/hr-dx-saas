-- テレワーク端末ペアリング — 管理画面サイドバー（service / tenant_service）
-- app_role_service は付けない（全 adm ロールがメニューに表示可能）

INSERT INTO public.service (id, service_category_id, name, category, title, description, sort_order, route_path, app_role_group_id, app_role_group_uuid, target_audience, release_status)
VALUES (
  'b7c8d9e0-f1a2-4b3c-9d8e-7f6e5d4c3b2a',
  '35c69c7f-6580-4250-a125-d15c28ead6b2',
  'テレワーク端末ペアリング',
  NULL,
  '勤怠・端末',
  'テレワーク用 PC の登録申請と人事による承認',
  265,
  '/adm/device-pairing',
  NULL,
  NULL,
  'adm',
  '公開'
)
ON CONFLICT (id) DO NOTHING;

-- program-targets と同様に、該当テナントへ tenant_service を付与
INSERT INTO public.tenant_service (tenant_id, service_id)
SELECT DISTINCT ts.tenant_id, 'b7c8d9e0-f1a2-4b3c-9d8e-7f6e5d4c3b2a'::uuid
FROM public.tenant_service ts
WHERE ts.service_id = 'd8e9f0a1-b2c3-4d5e-6f7a-8b9c0d1e2f3a'
  AND NOT EXISTS (
    SELECT 1 FROM public.tenant_service t2
    WHERE t2.tenant_id = ts.tenant_id AND t2.service_id = 'b7c8d9e0-f1a2-4b3c-9d8e-7f6e5d4c3b2a'::uuid
  );

INSERT INTO public.tenant_service (tenant_id, service_id)
SELECT DISTINCT ts.tenant_id, 'b7c8d9e0-f1a2-4b3c-9d8e-7f6e5d4c3b2a'::uuid
FROM public.tenant_service ts
WHERE ts.service_id = '3a5034ba-06dc-4157-b1bd-351d4bc5c01f'
  AND NOT EXISTS (
    SELECT 1 FROM public.tenant_service t2
    WHERE t2.tenant_id = ts.tenant_id AND t2.service_id = 'b7c8d9e0-f1a2-4b3c-9d8e-7f6e5d4c3b2a'::uuid
  );

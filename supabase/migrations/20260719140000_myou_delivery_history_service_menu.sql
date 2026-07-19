-- =============================================================
-- mYou サービスメニュー（service テーブル）に「出荷リスト」を新設
--
-- /myou/delivery-history（出荷データ履歴・出荷先での絞り込み）は
-- 従来「出荷登録（/myou/delivery-scan）」内のタブだったが、独立した
-- 別画面として切り出したため、既存の出荷登録（d7792f34-...）と同じ
-- テナント・役割にのみ表示されるようメニューへ新規登録する。
--
-- ⚠ service / tenant_service はクラウドDBと同期しているマスタのため、
--   本番適用は必ず内容確認のうえで行うこと。
-- =============================================================

INSERT INTO public.service (id, service_category_id, name, category, title, description, sort_order, route_path, app_role_group_id, app_role_group_uuid, target_audience, release_status)
VALUES (
  '9d049bab-ba26-4d0b-b915-d117bd18a1d0'::uuid,
  'fbbd4d45-6610-44ef-9989-3f3183ce3158'::uuid,
  '出荷リスト（出荷データ履歴）',
  NULL,
  '出荷データ履歴の一覧・出荷先での絞り込み',
  '出荷登録（QRスキャン・在庫表より）で登録された出荷データ履歴を出荷日の新しい順に一覧表示します。出荷先（施工会社）で絞り込んで確認できます。',
  25,
  '/myou/delivery-history',
  NULL,
  NULL,
  'all_users',
  '公開'
)
ON CONFLICT (id) DO NOTHING;

-- 新設サービスのテナント・ロール割当を既存の出荷登録からコピーする
-- （tenant_service / app_role_service の両方で有効なテナント・役割にのみ表示される）
INSERT INTO public.tenant_service (tenant_id, service_id, start_date, status)
SELECT ts.tenant_id, '9d049bab-ba26-4d0b-b915-d117bd18a1d0'::uuid, ts.start_date, ts.status
FROM public.tenant_service ts
WHERE ts.service_id = 'd7792f34-07ed-45e4-9540-64b22a48e133'::uuid
  AND NOT EXISTS (
    SELECT 1 FROM public.tenant_service dup
    WHERE dup.tenant_id = ts.tenant_id
      AND dup.service_id = '9d049bab-ba26-4d0b-b915-d117bd18a1d0'::uuid
  );

INSERT INTO public.app_role_service (app_role_id, service_id)
SELECT ars.app_role_id, '9d049bab-ba26-4d0b-b915-d117bd18a1d0'::uuid
FROM public.app_role_service ars
WHERE ars.service_id = 'd7792f34-07ed-45e4-9540-64b22a48e133'::uuid
  AND NOT EXISTS (
    SELECT 1 FROM public.app_role_service dup
    WHERE dup.app_role_id = ars.app_role_id
      AND dup.service_id = '9d049bab-ba26-4d0b-b915-d117bd18a1d0'::uuid
  );

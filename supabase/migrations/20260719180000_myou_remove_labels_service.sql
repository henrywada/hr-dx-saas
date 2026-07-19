-- =============================================================
-- 「QRラベル発行」（/myou/labels）メニューの削除
--
-- 現行の入荷登録（/myou/receiving-scan）は入荷スキャン時に
-- 新規ロットを直接登録する仕様となっており、事前にラベルを
-- 発行して status='issued' の在庫を作る本画面の運用は行われていない。
-- 画面・Server Action ともに未使用のため、サービスメニュー登録ごと削除する。
--
-- ⚠ service / tenant_service はクラウドDBと同期しているマスタのため、
--   本番適用は必ず内容確認のうえで行うこと。
-- =============================================================

DELETE FROM public.app_role_service
WHERE service_id = '9e8d7c6b-5a4f-4e3d-8c2b-1a0f9e8d7c6b'::uuid;

DELETE FROM public.tenant_service
WHERE service_id = '9e8d7c6b-5a4f-4e3d-8c2b-1a0f9e8d7c6b'::uuid;

DELETE FROM public.service
WHERE id = '9e8d7c6b-5a4f-4e3d-8c2b-1a0f9e8d7c6b'::uuid;

-- 端末登録を /approve_pc から /adm/device-pairing へ戻す（移動の取り消し）
-- 既に 20260328150000 を適用済みの環境向け。未適用でも id で上書きで問題なし。

UPDATE public.service
SET route_path = '/adm/device-pairing'
WHERE id = 'b7c8d9e0-f1a2-4b3c-9d8e-7f6e5d4c3b2a';

-- =============================================================
-- mYou サービスメニュー（service テーブル）の修正・追加
--
-- 既存の不整合:
--   - 「① 納入QRスキャン（製造元より入荷時）」が出荷登録画面
--     （/myou/delivery-scan）を指していた
--   - 「② 出荷QRスキャン」が有効期限監視画面
--     （/myou/expiration-alerts）を指していた
--   - 説明文に未実装機能（毎日深夜の自動送信・ブロックチェーン）の記述
--
-- 新設画面のメニュー追加:
--   - 在庫一覧（/myou/inventory）
--   - QRラベル発行（/myou/labels）
--
-- ⚠ service / tenant_service はクラウドDBと同期しているマスタのため、
--   本番適用は必ず内容確認のうえで行うこと。
-- =============================================================

-- ① 入荷スキャン: 新設の /myou/receiving-scan を指すように修正
UPDATE public.service
SET
  route_path = '/myou/receiving-scan',
  title = '入荷登録（QRスキャン）',
  description = '１．製造元からスプレー缶が納品された際に、担当者がスマートデバイスでラベルのQRコードをスキャンします。
２．QRコード内の「シリアル番号」と「有効期限」を読み取り、入荷日とあわせて在庫として登録します。'
WHERE id = 'fd1f4395-3148-4c8d-8e4a-f11f795160d8'::uuid;

-- ② 出荷スキャン: /myou/delivery-scan（出荷登録画面）を指すように修正
UPDATE public.service
SET
  route_path = '/myou/delivery-scan',
  title = '出荷登録（QRスキャン）',
  description = '１．施工会社へ製品を出荷（納入）する際に、担当者がラベルのQRコードをスキャンします。
２．「どの製品（シリアル番号）を」「どの施工会社に」「いつ出荷したか」を自動でデータベースに記録します。'
WHERE id = 'd7792f34-07ed-45e4-9540-64b22a48e133'::uuid;

-- 有効期限監視: 名称の不要なタブ文字を除去し、手動送信運用の説明に修正
UPDATE public.service
SET
  name = '有効期限監視・アラート',
  title = '製品有効期限の監視とアラート通知',
  description = '出荷済み製品のうち有効期限が30日以内のものを施工会社別に一覧表示します。「アラート送信」ボタンから対象の施工会社へ注意喚起メールを送信でき、送信履歴も確認できます。'
WHERE id = 'b8c65146-2d08-45b6-9d30-50a0f851dcec'::uuid;

-- トレーサビリティ検索: 未実装機能（ブロックチェーン）の記述を削除
UPDATE public.service
SET
  description = 'シリアル番号やQRスキャンにより、製品の有効期限・入荷日・出荷先・出荷日といった流通履歴を即座に照会できます。転売・不正利用が疑われる際の流通経路特定に活用できます。'
WHERE id = '4b774928-742b-4db4-8993-6f692ebbf522'::uuid;

-- 新設: 在庫一覧
INSERT INTO public.service (id, service_category_id, name, category, title, description, sort_order, route_path, app_role_group_id, app_role_group_uuid, target_audience, release_status)
VALUES (
  '3f6b1c2e-8a4d-4f0b-9c5e-7d2a1b3c4d5e'::uuid,
  'fbbd4d45-6610-44ef-9989-3f3183ce3158'::uuid,
  '在庫一覧',
  NULL,
  '入荷済み製品の在庫一覧',
  '入荷済み（未出荷）のスプレー缶をシリアル番号・有効期限・入荷日つきで一覧表示します。期限の近い在庫から早期に出荷する判断に活用できます。',
  15,
  '/myou/inventory',
  NULL,
  NULL,
  'all_users',
  '公開'
)
ON CONFLICT (id) DO NOTHING;

-- 新設: QRラベル発行
INSERT INTO public.service (id, service_category_id, name, category, title, description, sort_order, route_path, app_role_group_id, app_role_group_uuid, target_audience, release_status)
VALUES (
  '9e8d7c6b-5a4f-4e3d-8c2b-1a0f9e8d7c6b'::uuid,
  'fbbd4d45-6610-44ef-9989-3f3183ce3158'::uuid,
  'QRラベル発行',
  NULL,
  'シリアル番号採番とQRラベルの発行',
  'シリアル番号を自動採番し、有効期限を埋め込んだQRコードラベルを生成・印刷します。発行済みシリアルはシステムに登録され、入荷スキャン時の照合に使用されます。',
  50,
  '/myou/labels',
  NULL,
  NULL,
  'all_users',
  '公開'
)
ON CONFLICT (id) DO NOTHING;

-- 新設サービスのテナント・ロール割当を既存の入荷スキャンからコピーする
-- （tenant_service / app_role_service の両方で有効なテナント・役割にのみ表示される）
INSERT INTO public.tenant_service (tenant_id, service_id, start_date, status)
SELECT ts.tenant_id, s.new_id, ts.start_date, ts.status
FROM public.tenant_service ts
CROSS JOIN (VALUES
  ('3f6b1c2e-8a4d-4f0b-9c5e-7d2a1b3c4d5e'::uuid),
  ('9e8d7c6b-5a4f-4e3d-8c2b-1a0f9e8d7c6b'::uuid)
) AS s(new_id)
WHERE ts.service_id = 'fd1f4395-3148-4c8d-8e4a-f11f795160d8'::uuid
  AND NOT EXISTS (
    SELECT 1 FROM public.tenant_service dup
    WHERE dup.tenant_id = ts.tenant_id AND dup.service_id = s.new_id
  );

INSERT INTO public.app_role_service (app_role_id, service_id)
SELECT ars.app_role_id, s.new_id
FROM public.app_role_service ars
CROSS JOIN (VALUES
  ('3f6b1c2e-8a4d-4f0b-9c5e-7d2a1b3c4d5e'::uuid),
  ('9e8d7c6b-5a4f-4e3d-8c2b-1a0f9e8d7c6b'::uuid)
) AS s(new_id)
WHERE ars.service_id = 'fd1f4395-3148-4c8d-8e4a-f11f795160d8'::uuid
  AND NOT EXISTS (
    SELECT 1 FROM public.app_role_service dup
    WHERE dup.app_role_id = ars.app_role_id AND dup.service_id = s.new_id
  );

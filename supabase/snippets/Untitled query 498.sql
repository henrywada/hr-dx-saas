-- 1. まず「管理者用のテナント（会社）」を作ります
WITH new_tenant AS (
  INSERT INTO public.tenants (name, contact_date, paid_amount, employee_count)
  VALUES ('システム管理用テナント', CURRENT_DATE, 0, 1)
  RETURNING id
)

-- 2. 次に、あなたのユーザーIDを使って「従業員」データを作ります
INSERT INTO public.employees (id, tenant_id, name, app_role)
SELECT
  '47e5fc59-9cb8-4a42-b6ba-dd06e2a06200', -- 画像にあったあなたのUID
  id,                                     -- 作ったばかりのテナントID
  '管理者 太郎',                          -- 画面表示用の名前（自由に変えてOK）
  'boss'                                  -- 権限（bossなどにしておきます）
FROM new_tenant;
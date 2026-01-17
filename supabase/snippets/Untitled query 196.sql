-- ▼▼▼ 完全自動修復スクリプト ▼▼▼

-- 1. 邪魔なセキュリティ(RLS)を一時停止（作業用）
ALTER TABLE public.employees DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants DISABLE ROW LEVEL SECURITY;

-- 2. データを一旦空にする（ID不一致のゴミデータを消す）
DELETE FROM public.employees;
DELETE FROM public.tenants;

-- 3. 自動変数定義
DO $$
DECLARE
    real_user_id uuid;
    new_tenant_id uuid;
BEGIN
    -- 【重要】今の「wada007@gmail.com」の本当のIDを自動取得する
    SELECT id INTO real_user_id FROM auth.users WHERE email = 'wada007@gmail.com' LIMIT 1;

    -- もしユーザーが見つからなければエラーを出す
    IF real_user_id IS NULL THEN
        RAISE EXCEPTION 'ユーザーが見つかりません。先にAuthenticationでユーザーを作成してください。';
    END IF;

    -- 4. テナント作成
    INSERT INTO public.tenants (name)
    VALUES ('SaaS管理株式会社')
    RETURNING id INTO new_tenant_id;

    -- 5. 従業員作成（正しいIDを使って紐付ける）
    INSERT INTO public.employees (id, tenant_id, name, role)
    VALUES (
        real_user_id,   -- ★ここで正しいIDが自動で入ります
        new_tenant_id,
        'SaaS管理者',
        'developer'
    );
    
    -- 6. 特権フラグ（スーパー管理者権限）も念押しで再設定
    UPDATE auth.users
    SET raw_app_meta_data = jsonb_set(
        COALESCE(raw_app_meta_data, '{}'::jsonb),
        '{is_super_admin}',
        'true'
    )
    WHERE id = real_user_id;

    RAISE NOTICE '修復完了！ ID: %', real_user_id;
END $$;

-- 7. セキュリティ(RLS)を復活させる
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
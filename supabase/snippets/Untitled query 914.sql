DO $$
DECLARE
    target_user_id uuid;
    new_tenant_id uuid;
BEGIN
    -- 1. さっき作ったユーザーのIDを自動取得
    SELECT id INTO target_user_id FROM auth.users WHERE email = 'wada007@gmail.com';

    -- ユーザーがいなければエラー
    IF target_user_id IS NULL THEN
        RAISE EXCEPTION 'ユーザーが見つかりません。ステップ1でユーザーを作成してください。';
    END IF;

    -- 2. テナント（会社）を作成
    INSERT INTO public.tenants (name)
    VALUES ('SaaS管理株式会社')
    RETURNING id INTO new_tenant_id;

    -- 3. 従業員データを作成（ユーザーIDと会社IDを紐付け）
    INSERT INTO public.employees (id, tenant_id, name, role)
    VALUES (
        target_user_id,
        new_tenant_id,
        'SaaS管理者',
        'developer'
    );

    -- 4. ユーザー本体に特権フラグ（is_super_admin）を焼き付ける
    UPDATE auth.users
    SET raw_app_meta_data = jsonb_set(
        COALESCE(raw_app_meta_data, '{}'::jsonb),
        '{is_super_admin}',
        'true'
    )
    WHERE id = target_user_id;

    RAISE NOTICE '設定完了！ ユーザーID: %, 会社ID: %', target_user_id, new_tenant_id;
END $$;
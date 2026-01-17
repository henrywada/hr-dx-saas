DO $$
DECLARE
    -- ★ここにステップ1でコピーしたUser UIDを貼り付けてください
    target_user_id uuid := '33c22065-e3b2-4065-b506-689c7fdfe4e6'; 
    
    -- 作成するテナント名
    new_tenant_name text := 'SaaS管理株式会社';
    new_tenant_id uuid;
BEGIN
    -- 1. テナント（会社）を作成
    INSERT INTO public.tenants (name)
    VALUES (new_tenant_name)
    RETURNING id INTO new_tenant_id;

    -- 2. 従業員データ（SaaS管理者）を作成
    -- ※ emailカラムを除外しました
    INSERT INTO public.employees (id, tenant_id, name, role)
    VALUES (
        target_user_id,
        new_tenant_id,
        'SaaS管理者',
        'developer' -- SaaS管理者権限
    );

    RAISE NOTICE '作成完了: テナントID=%, ユーザーID=%', new_tenant_id, target_user_id;
END $$;
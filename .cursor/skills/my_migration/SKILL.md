---
name: my_migration
description: >-
  新しいDBテーブルのマイグレーションSQLをRLSポリシー込みで生成する。
  Use when the user invokes /my_migration, asks to create a migration, テーブル作成, マイグレーション追加, or similar.
---

# my_migration（マイグレーション作成）

## 使い方

```
/my_migration <テーブル名> [オプション]
```

- `<テーブル名>`: snake_case（例: `attendance_records`, `stress_check_results`）
- `[オプション]`: `saas`（SaaS管理者専用テーブル、RLSポリシーが異なる）

## 生成するファイル

`supabase/migrations/YYYYMMDDHHMMSS_create_<テーブル名>.sql`

タイムスタンプは実行時点の日時（Asia/Tokyo）を使用。

## テンプレート（通常のテナントテーブル）

```sql
-- テーブル作成
CREATE TABLE public.<table_name> (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  employee_id UUID        REFERENCES public.employees(id) ON DELETE SET NULL,
  -- TODO: ドメイン固有のカラムをここに追加
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS有効化（必須）
ALTER TABLE public.<table_name> ENABLE ROW LEVEL SECURITY;

-- テナント分離ポリシー（必須）
CREATE POLICY "tenant_isolation" ON public.<table_name>
  FOR ALL USING (
    tenant_id = (
      SELECT tenant_id FROM public.employees
      WHERE auth_user_id = auth.uid()
    )
  );

-- updated_at 自動更新トリガー
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.<table_name>
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);
```

## テンプレート（SaaS管理者専用テーブル）

`saas` オプション指定時。`tenant_id` なし、RLSは管理者ロールで制御。

```sql
CREATE TABLE public.<table_name> (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  -- TODO: ドメイン固有のカラムをここに追加
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.<table_name> ENABLE ROW LEVEL SECURITY;

CREATE POLICY "saas_admin_only" ON public.<table_name>
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.employees
      WHERE auth_user_id = auth.uid()
        AND app_role = 'supaUser'
    )
  );
```

## 生成後の確認チェックリスト

- [ ] `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` が含まれているか
- [ ] `CREATE POLICY` が含まれているか
- [ ] `supabase migration up` で適用済みか（`db reset` は使わない）
- [ ] `supabase gen types typescript --local > src/lib/supabase/types.ts` で型を再生成したか

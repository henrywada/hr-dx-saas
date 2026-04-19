---
name: my_db_schema
description: >-
  Supabase（ローカル）の全テーブル・カラム・コメントを一覧表示する。
  Use when the user invokes /my_db_schema, asks for テーブル一覧, カラム一覧, DB構造, スキーマ確認, or similar.
---

# my_db_schema（DBスキーマ一覧）

## 実行内容

以下のSQLをローカルSupabase（`postgresql://postgres:postgres@127.0.0.1:55422/postgres`）に対してpsqlで実行し、結果を表示する。

```bash
psql postgresql://postgres:postgres@127.0.0.1:55422/postgres -c "
SELECT
  t.table_name                  AS テーブル名,
  obj_description(pc.oid)       AS テーブルコメント,
  c.column_name                 AS カラム名,
  c.data_type                   AS 型,
  c.is_nullable                 AS NULL許可,
  pgd.description               AS カラムコメント
FROM information_schema.tables t
JOIN information_schema.columns c
  ON t.table_name = c.table_name AND t.table_schema = c.table_schema
LEFT JOIN pg_catalog.pg_class pc
  ON pc.relname = t.table_name AND pc.relnamespace = 'public'::regnamespace
LEFT JOIN pg_catalog.pg_description pgd
  ON pgd.objoid = pc.oid AND pgd.objsubid = c.ordinal_position
WHERE t.table_schema = 'public'
  AND t.table_type = 'BASE TABLE'
ORDER BY t.table_name, c.ordinal_position;
"
```

## 結果の見方

- **テーブルコメント**: `COMMENT ON TABLE` で設定した説明
- **カラムコメント**: `COMMENT ON COLUMN` で設定した説明
- コメントが空の場合は未設定

## 特定テーブルだけ確認したい場合

ユーザーがテーブル名を指定した場合は `WHERE` に条件を追加する：

```sql
AND t.table_name = '指定テーブル名'
```

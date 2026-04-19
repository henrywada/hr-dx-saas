---
name: my_db_table
description: >-
  Supabase（ローカル）の public スキーマのテーブル名とコメントを一覧表示する。
  Use when the user invokes /my_db_table, asks for テーブル一覧, テーブル名, or similar.
---

# my_db_table（テーブル名・コメント一覧）

## 実行内容

以下のコマンドをローカル Supabase に対して実行し、テーブル名とテーブルコメントを表示する。

```bash
psql postgresql://postgres:postgres@127.0.0.1:55422/postgres -c "
SELECT
  t.table_name                AS テーブル名,
  obj_description(pc.oid)    AS テーブルコメント
FROM information_schema.tables t
LEFT JOIN pg_catalog.pg_class pc
  ON pc.relname = t.table_name
  AND pc.relnamespace = 'public'::regnamespace
WHERE t.table_schema = 'public'
  AND t.table_type = 'BASE TABLE'
ORDER BY t.table_name;
"
```

## 詳細情報が必要な場合

カラム・カラムコメントも含めた詳細は `/my_db_schema` を使う。

---
name: my_list_tables
description: >-
  service / service_category と各画面の page.tsx から Supabase の実テーブル名と保存内容の要約を一覧化する。
  Use when the user invokes /my_list_tables, asks for サービスとテーブル対応, route と DB テーブル,
  service 一覧とテーブル, or similar.
---

# /my_list_tables（サービス・画面・テーブル対応一覧）

## 目的

マスタの **サービス定義** と **実装** を突き合わせ、次の列を **表示順どおり** に表形式で出す。

## データソースと表示順

1. **DB**: `public.service` と `public.service_category` を結合して読む。
2. **パス列**: このリポジトリでは DB 上の列名は **`route_path`**（ユーザーが `service.path` と書いている場合も同じ列を指す）。
3. **`route_path` が NULL（または空文字）の行は一覧から除外**する。
4. **ソート**（昇順）:
   - 第1キー: `service_category.sort_order`（カテゴリ未設定は `Number.MAX_SAFE_INTEGER` 相当で末尾に回す既存実装に合わせる）
   - 第2キー: `service.sort_order`

参照実装: `src/features/system-master/queries.ts` の `getServices`、`src/app/api/system-master/services/route.ts` のソート。

## 出力する列（見出しは日本語で固定）

| 列 | 内容 |
|----|------|
| 区分 | `service_category.name`（未設定なら空または「（未分類）」など一貫した表記） |
| サービス名 | `service.name` |
| パス | `service.route_path` |
| テーブル名 | 下記「テーブル名の取り方」で特定した **実際の PostgreSQL テーブル名**（複数ある場合はカンマ区切り、重複は除く） |
| 要約 | 下記「要約の書き方」 |

## テーブル名の取り方

1. **`route_path` から `page.tsx` を特定**  
   - 値は通常 `/foo/bar` 形式。Next.js App Router では **route group**（`(tenant)` 等）は URL に出ない。  
   - `src/app` 配下を探索し、URL セグメントに一致する **`page.tsx`** を見つける（例: `/adm/attendance/dashboard` → `**/adm/attendance/dashboard/page.tsx`）。

2. **そのページが触るテーブルを追う**  
   - まず対象の `page.tsx` を読む。  
   - `supabase.from('...')` や Server Actions・`queries`・同じルート配下の `features/**` への import を **必要に応じて追跡**し、出現する **`.from('テーブル名')`** の文字列を集める。  
   - ビュー・RPC・生 SQL がある場合は、その中で参照しているベーステーブルが分かればそれを記載（曖昧なら注記）。

3. **間接参照**  
   - ページがラッパーだけでデータ取得が子コンポーネントや `actions.ts` にある場合は、そこまで辿って同様に `.from('...')` を集める。

## 要約の書き方

- 優先: リポジトリの `schema.sql` またはマイグレーション内の **`COMMENT ON TABLE`** / **`COMMENT ON COLUMN`** があれば、それを要約に反映する。
- 補足: コード上のドメイン（勤怠・申請・マスタなど）が分かれば、**そのテーブルが保持する業務データを 1 行程度の日本語**で書く（推測に留まる場合は「推定:」と明記）。

## 出力フォーマット

- **Markdown の表**を推奨（列数が多い場合は横に長くなりすぎないよう、テーブル名は必要なら折り返し可）。
- データ取得に失敗した行だけは、パスと理由を短く注記する。

## 注意

- **マルチテナント**: 一覧は「どのテーブルがその画面から使われるか」の対応であり、RLS や `tenant_id` の説明は要約に含めてよいが必須ではない。
- **同一パスに複数 page がないか**: 稀にルートグループ違いで重複があるため、実際にそのサービスが指す実装を 1 系統に絞って追う。

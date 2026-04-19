---
name: my_list_tables
description: >-
  service / service_category と各画面の page.tsx から Supabase の実テーブル名と保存内容の要約を一覧化する。
  Use when the user invokes /my_list_tables, asks for サービスとテーブル対応, route と DB テーブル一覧, or similar.
---

# my_list_tables（サービス・画面・テーブル対応一覧）

## 目的

`public.service` と `public.service_category` を結合し、各画面が使う DB テーブルを表形式で出す。

## 出力列

| 列 | 内容 |
|----|------|
| 区分 | `service_category.name`（未設定は「未分類」） |
| サービス名 | `service.name` |
| パス | `service.route_path` |
| テーブル名 | その画面が触る PostgreSQL テーブル名（カンマ区切り） |
| 要約 | テーブルが保持する業務データを1行で |

- `route_path` が NULL / 空の行は除外する
- ソート: `service_category.sort_order` → `service.sort_order` 昇順

## テーブル名の調べ方

1. `route_path` から `src/app/` 配下の対応する `page.tsx` を特定する（route group は URL に出ない）
2. `page.tsx` と、そこから import される `queries.ts` / `actions.ts` / features 配下を辿る
3. `.from('テーブル名')` の文字列を集める
4. ビュー・RPC は参照元ベーステーブルを記載（不明なら「推定:」と注記）

## 出力フォーマット

Markdown の表で出力する。取得できなかった行はパスと理由を注記する。

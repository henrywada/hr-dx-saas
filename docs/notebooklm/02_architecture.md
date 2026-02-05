# アーキテクチャ（NotebookLM用）

## 技術スタック

- フロント：Next.js 16.1.1（App Router）
- DB/Auth：Supabase（ローカル開発 v2.72.7）
- 開発IDE：Antigravity（WSL Ubuntu 24.04内のプロジェクトを参照）
- Node.js：v24.13.0
- npm：11.6.2

## ディレクトリ概要

- app/ : 画面・ルート（Next.js App Router）
- app/api/ : APIルート（もし使用していれば）
- components/ : 再利用可能なUIコンポーネント
- supabase/ : migrations / config
- lib/ : ユーティリティ関数

## 認証・認可

- Supabase Authの方式：【メール/パスワード、SNS等を記入】
- RLS（Row Level Security）の方針：【有効/無効、ポリシー概要を記入】
- テナント分離（company_id等）の設計方針：【あり/なし、カラム名を記入】

## 外部連携（あれば）

- n8n：【連携内容を記入】
- Slack：【連携内容を記入】
- Google：【連携内容を記入】

## 起動コマンド

- Supabase起動：`npm run sb:start`
- Next.js起動：`npm run dev`
- アプリURL：http://localhost:3000/login

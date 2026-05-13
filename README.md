# HR-DX SaaS

マルチテナント対応の HR（人事）管理 SaaS アプリケーション。

## 機能

- **認証システム** — Supabase Auth による安全な認証
- **マルチテナント対応** — RLS ポリシーによる完全なデータ分離
- **ストレスチェック・組織診断・パルスサーベイ**
- **QR 出退勤・CSV 出退勤・テレワーク勤怠**
- **残業管理・eラーニング・AI 採用支援**
- **テナント管理・ユーザー管理・ダッシュボード**

## 技術スタック

- **フレームワーク**: Next.js 16 (App Router) + React 19
- **言語**: TypeScript 5
- **スタイリング**: Tailwind CSS v4
- **データベース**: PostgreSQL (Supabase + RLS)
- **認証**: Supabase Auth
- **開発環境**: WSL2 (Ubuntu 24.04)

## 前提条件

- Node.js 24.x 以上
- npm 11.x 以上
- Docker Desktop（Supabase ローカル開発用）
- WSL2（Windows 環境の場合）

## セットアップ

```bash
# 依存関係のインストール
npm install

# 環境変数の設定
cp .env.example .env.local
# .env.local を編集して Supabase の認証情報を設定

# Supabase ローカル起動
supabase start

# 開発サーバー起動（http://localhost:3000）
npm run dev
```

## 利用可能なスクリプト

```bash
npm run dev                        # 開発サーバー起動（ポート 3000）
npm run build                      # 本番用ビルド
npm run type-check                 # TypeScript 型チェック
npm run lint                       # ESLint チェック
npm run lint:fix                   # ESLint 自動修正
npm run format                     # Prettier フォーマット
npm run format:check               # フォーマットチェック
npm run clean                      # ビルドキャッシュクリア

npm run supabase:migration-up      # 未適用マイグレーションのみ適用（既存データを保持）
npm run supabase:migration-list    # 適用済みマイグレーション一覧
npm run supabase:migration-repair  # マイグレーション履歴の修復
```

## データベース

```bash
# 新しいマイグレーションを作成
supabase migration new <migration_name>

# マイグレーションを適用（既存データを保持）
npm run supabase:migration-up

# 型定義を生成
supabase gen types typescript --local > src/lib/supabase/types.ts
```

> **重要:** `supabase db reset` は DB を作り直してシードを流すため、ローカルで蓄積したデータが失われます。
> 日々の開発では `migration up` を使ってください。

## 開発環境 URL

| サービス | URL |
|---------|-----|
| Next.js | http://localhost:3000 |
| Supabase Studio | http://127.0.0.1:55423 |
| Supabase API | http://127.0.0.1:55421 |
| PostgreSQL | postgresql://postgres:postgres@127.0.0.1:55422/postgres |

## プロジェクト構造

```
hr-dx-saas/
├── src/
│   ├── app/
│   │   ├── (auth)/              # 未認証ユーザー向け
│   │   ├── (tenant)/
│   │   │   ├── (default)/       # 一般従業員向け
│   │   │   └── (colored)/adm/   # テナント管理者向け
│   │   ├── (saas-admin)/        # SaaS 運営者向け
│   │   └── p/                   # パブリックページ
│   ├── features/                # 機能ドメイン（実装の集約先）
│   ├── components/              # 共通コンポーネント
│   ├── lib/
│   │   ├── supabase/            # Supabase クライアント
│   │   └── auth/                # 認証ヘルパー
│   └── config/routes.ts         # APP_ROUTES 定数
├── supabase/
│   ├── migrations/              # SQL マイグレーション
│   └── config.toml
└── public/
```

## セキュリティ

- **RLS ポリシー**: すべてのテーブルで Row Level Security を有効化
- **マルチテナント**: テナント間のデータ完全分離
- **環境変数**: 機密情報は環境変数で管理（`.env.local` / Vercel 環境変数）

詳細なアーキテクチャ・コーディング規約・禁止事項は [CLAUDE.md](./CLAUDE.md) を参照。

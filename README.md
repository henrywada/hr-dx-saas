# HR-DX SaaS

マルチテナント対応のHR（人事）管理SaaSアプリケーション

## 🚀 機能

- ✅ **認証システム** - Supabase Authによる安全な認証
- ✅ **マルチテナント対応** - RLSポリシーによる完全なデータ分離
- ✅ **給与計算** - 給与明細の作成・管理
- ✅ **勤怠管理** - 出退勤記録と集計
- ✅ **請求書管理** - 請求書の作成・発行
- ✅ **ユーザー管理** - 従業員・管理者の管理
- ✅ **テナント管理** - 複数企業の管理
- ✅ **ダッシュボード** - データの可視化

## 🛠️ 技術スタック

- **フレームワーク**: Next.js 16 (App Router)
- **言語**: TypeScript
- **スタイリング**: Tailwind CSS v4
- **データベース**: PostgreSQL (Supabase)
- **認証**: Supabase Auth
- **開発環境**: WSL2 (Ubuntu 24.04)

## 📋 前提条件

- Node.js 24.x以上
- npm 11.x以上
- Docker Desktop (Supabase Local Development用)
- WSL2 (Windows環境の場合)

## 🔧 セットアップ

### 1. リポジトリのクローン

\`\`\`bash git clone <repository-url> cd hr-dx-saas \`\`\`

### 2. 依存関係のインストール

\`\`\`bash npm install \`\`\`

### 3. 環境変数の設定

\`\`\`bash cp .env.example .env.local \`\`\`

`.env.local`を編集して、Supabaseの認証情報を設定してください。

### 4. Supabaseの起動

\`\`\`bash

# WSL環境の場合

export PATH="$HOME/.local/bin:$PATH" supabase start \`\`\`

### 5. 開発サーバーの起動

\`\`\`bash npm run dev \`\`\`

アプリケーションは http://localhost:3001 で起動します。

## 📝 利用可能なスクリプト

- `npm run dev` - 開発サーバーを起動（ポート3001）
- `npm run build` - 本番用ビルドを作成
- `npm run start` - 本番サーバーを起動
- `npm run lint` - ESLintでコードをチェック
- `npm run lint:fix` - ESLintで自動修正
- `npm run type-check` - TypeScriptの型チェック
- `npm run format` - Prettierでコードをフォーマット
- `npm run format:check` - フォーマットをチェック
- `npm run clean` - ビルドキャッシュをクリア

## 🗄️ データベース

### マイグレーション

新しいマイグレーションを作成: \`\`\`bash supabase migration new <migration_name>
\`\`\`

マイグレーションを適用: \`\`\`bash supabase db reset \`\`\`

### 型定義の生成

\`\`\`bash supabase gen types typescript --local > src/lib/supabase/types.ts
\`\`\`

## 🌐 環境

### 開発環境

| サービス        | URL                                                     |
| --------------- | ------------------------------------------------------- |
| Next.js         | http://localhost:3000（または .env の NEXT_PUBLIC_APP_URL） |
| Supabase Studio | http://127.0.0.1:55423（`supabase/config.toml` の studio ポート） |
| Supabase API    | http://127.0.0.1:55421（`supabase/config.toml` の [api] port）   |
| PostgreSQL      | postgresql://postgres:postgres@127.0.0.1:55422/postgres          |

## 🏗️ プロジェクト構造

\`\`\` hr-dx-saas/ ├── src/ │ ├── app/ # Next.js App Router │ │ ├── (admin)/ #
管理者画面 │ │ ├── (auth)/ # 認証画面 │ │ └── (tenant)/ # テナント画面 │ ├──
components/ # 共通コンポーネント │ ├── features/ # 機能別コンポーネント │ ├──
lib/ # ユーティリティ・ヘルパー │ │ ├── supabase/ # Supabaseクライアント │ │ ├──
auth/ # 認証ヘルパー │ │ └── tenant/ # テナント管理 │ └── styles/ #
グローバルスタイル ├── supabase/ │ ├── migrations/ #
データベースマイグレーション │ └── config.toml # Supabase設定 └── public/ #
静的ファイル \`\`\`

## 🔒 セキュリティ

- **RLSポリシー**: すべてのテーブルでRow Level Securityを有効化
- **マルチテナント**: テナント間のデータ完全分離
- **認証**: Supabase Authによる安全な認証
- **環境変数**: 機密情報は環境変数で管理

## 🌍 多言語対応

- 日本語
- 英語

## 📱 レスポンシブデザイン

すべての画面がモバイル・タブレット・デスクトップに対応しています。

## 🤝 コントリビューション

1. フォークする
2. フィーチャーブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add some amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

## 📄 ライセンス

このプロジェクトはプライベートプロジェクトです。

## 🐛 トラブルシューティング

### Supabaseが起動しない

\`\`\`bash supabase stop supabase start \`\`\`

### ポートが使用中

\`\`\`bash

# ポート3001を解放

fuser -k 3001/tcp npm run dev \`\`\`

### 型エラー

\`\`\`bash npm run type-check \`\`\`

## 📞 サポート

問題が発生した場合は、Issueを作成してください。

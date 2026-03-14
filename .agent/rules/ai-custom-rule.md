# プロジェクト概要と基本方針

プロジェクトの目的・設計方針・データアクセスルール・プロジェクト構造は、すべて **`.agent/rules/basic.md`** に一本化しています。

- データベースアクセスとアーキテクチャ（API禁止、SC中心、queries/actions 分離）
- Supabase クライアントの使い分け（RLS と createAdminClient の扱い）
- ユーザー情報と Context（employees、getServerUser、AuthProvider/TenantProvider）
- ルーティング（APP_ROUTES、認証・認可ガード）
- UI/UX（loading.tsx、error.tsx）
- コマンドライン（WSL、supabase コマンド）

上記を含む詳細は **basic.md** を参照してください。

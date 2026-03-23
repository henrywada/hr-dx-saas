# QR 管理 Edge Functions（スラッグ一覧）

`supabase/functions/` 直下のフォルダ名がそのままエンドポイント名になります。

ローカル CLI はパスを小文字化して読み込むため、**ディレクトリ名はすべて小文字**にしています（`supabase start` の WARN 回避）。

| invoke 名（URL スラッグ） | ディレクトリ |
|---------------------------|----------------|
| `listpermissions` | `supabase/functions/listpermissions/` |
| `addpermission` | `supabase/functions/addpermission/` |
| `removepermission` | `supabase/functions/removepermission/` |
| `bulkimportpermissions` | `supabase/functions/bulkimportpermissions/` |
| `qr-admin-bulkimportpermissions` | `supabase/functions/qr-admin-bulkimportpermissions/` |

例: `{SUPABASE_URL}/functions/v1/listpermissions`

このリポジトリのローカル API ポートは `supabase/config.toml` の `[api] port`（既定 **55321**）です。例:

- `http://127.0.0.1:55321/functions/v1/qr-admin-bulkimportpermissions`

本番: `https://<project-ref>.supabase.co/functions/v1/qr-admin-bulkimportpermissions`

### 手動確認（CSV 一括）

1. `supabase/.env.local` に `SUPABASE_SERVICE_ROLE_KEY` を設定し、`supabase functions serve --env-file supabase/.env.local` を実行。
2. マイグレーション適用後、人事ロールで `/adm/csv-import` からテンプレート CSV をアップロード。
3. ログ: `supabase functions logs --name qr-admin-bulkimportpermissions --since 1h`
4. DB: `supervisor_qr_permissions` の更新と `qr_audit_logs`（`bulk_grant` / `bulk_grant_failed`）を確認。

デプロイ: `supabase functions deploy qr-admin-bulkimportpermissions`

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

このリポジトリのローカル API ポートは `supabase/config.toml` の `[api] port`（現在 **55421**）です。例:

- `http://127.0.0.1:55421/functions/v1/qr-admin-bulkimportpermissions`

本番: `https://<project-ref>.supabase.co/functions/v1/qr-admin-bulkimportpermissions`

### 手動確認（CSV 一括・レガシー）

`qr-admin-bulkimportpermissions` は QR 表示権限の一括登録用（従業員番号キー）。アプリの人事向け画面は `/adm/csv-import` から **`/adm/csv_atendance`（勤怠実績 CSV）** に移行済みのため、本関数の UI 導線は撤去済み。直接 `curl` 等で Edge を叩く検証に限定。

デプロイ: `supabase functions deploy qr-admin-bulkimportpermissions`

#!/usr/bin/env bash
# pg_dump --data-only で出力した SQL を、指定した PostgreSQL に流し込む。
# 接続先を明示するため DATABASE_URL（第2引数）必須。
#
# 使い方:
#   ./supabase/scripts/restore-pgdump-data.sh <backup.sql> '<postgresql://...>'
# 例（ローカル・実際に作られたファイル名に合わせる）:
#   ./supabase/scripts/restore-pgdump-data.sh supabase/backups/service_role_tables_data_20260323.sql 'postgresql://postgres:postgres@127.0.0.1:55322/postgres'
#   ./supabase/scripts/restore-pgdump-data.sh supabase/backups/service_tenant_tables_data_20260323_153045.sql 'postgresql://postgres:postgres@127.0.0.1:55322/postgres'
# 例（Supabase クラウド）:
#   ダッシュボードの Database → Connection string（URI）を使用。sslmode=require が付いていることが多い。
#
# 注意: 既存 PK と衝突すると失敗する。置き換え同期の場合は事前に対象テーブルのデータ削除が必要なことがある。

set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 <path-to-backup.sql> <DATABASE_URL>" >&2
  exit 1
fi

RAW_SQL_FILE="$1"
DATABASE_URL="$2"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
BACKUP_DIR="${REPO_ROOT}/supabase/backups"

# 相対パスはリポジトリルート基準で解決（カレントディレクトリに依存しない）
if [[ "${RAW_SQL_FILE}" == /* ]]; then
  SQL_FILE="${RAW_SQL_FILE}"
else
  SQL_FILE="${REPO_ROOT}/${RAW_SQL_FILE}"
fi

if [[ ! -f "${SQL_FILE}" ]]; then
  echo "Error: file not found: ${RAW_SQL_FILE}" >&2
  echo "Resolved path: ${SQL_FILE}" >&2
  echo "" >&2
  echo "ヒント: ドキュメントの例のファイル名は仮です。実際に作られた名前を指定してください。" >&2
  echo "  - backup-local-service-role-data.sh → service_role_tables_data_YYYYMMDD.sql" >&2
  echo "  - backup-local-service-tenant-data.sh → service_tenant_tables_data_YYYYMMDD_HHMMSS.sql" >&2
  if [[ -d "${BACKUP_DIR}" ]]; then
    echo "" >&2
    echo "次の supabase/backups 内の .sql があります:" >&2
    ls -1t "${BACKUP_DIR}"/*.sql 2>/dev/null || echo "  (なし)" >&2
  fi
  exit 1
fi

echo "Restoring ${SQL_FILE} -> (database from URL)"
psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -f "${SQL_FILE}"
echo "Done."

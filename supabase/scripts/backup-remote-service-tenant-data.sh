#!/usr/bin/env bash
# =============================================================================
# クラウド（または任意の PostgreSQL）から 4 テーブルのデータのみダンプする
# =============================================================================
#
# 同期の向き: クラウド → ローカル など「リモートがソース」のときに使用。
# 第1引数または環境変数 DATABASE_URL に接続 URI を渡す（sslmode=require を含めてよい）。
#
#   DATABASE_URL='postgresql://postgres:...@db.xxx.supabase.co:5432/postgres?sslmode=require' \
#     ./supabase/scripts/backup-remote-service-tenant-data.sh
#
# 出力: supabase/backups/service_tenant_tables_data_remote_<日時>.sql
#
# app_role / tenant_service / PK 衝突については backup-local-service-tenant-data.sh 先頭コメントを参照。

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
BACKUP_DIR="${REPO_ROOT}/supabase/backups"
DATE="$(date +%Y%m%d_%H%M%S)"

SOURCE_URL="${1:-${DATABASE_URL:-}}"
if [[ -z "${SOURCE_URL}" ]]; then
  echo "Usage: $0 '<DATABASE_URL>'" >&2
  echo "   or: DATABASE_URL='postgresql://...' $0" >&2
  exit 1
fi

if [[ -x "/usr/lib/postgresql/17/bin/pg_dump" ]]; then
  PG_DUMP="/usr/lib/postgresql/17/bin/pg_dump"
else
  PG_DUMP="pg_dump"
fi

mkdir -p "${BACKUP_DIR}"
OUT_FILE="${BACKUP_DIR}/service_tenant_tables_data_remote_${DATE}.sql"

echo "Backing up from remote -> ${OUT_FILE}"
"${PG_DUMP}" "${SOURCE_URL}" \
  --data-only \
  -t public.service_category \
  -t public.service \
  -t public.app_role_service \
  -t public.tenant_service \
  -f "${OUT_FILE}"

echo "Done."

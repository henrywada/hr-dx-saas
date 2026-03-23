#!/usr/bin/env bash
# service / service_category / app_role_service / app_role のデータのみをバックアップする。
# 使い方: リポジトリルートで ./supabase/scripts/backup-local-service-role-data.sh
# 前提: supabase start 済み。復元先には既に同一スキーマのテーブルが必要（--data-only のため）。

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
BACKUP_DIR="${REPO_ROOT}/supabase/backups"
DATE="$(date +%Y%m%d)"

export PGPASSWORD="${PGPASSWORD:-postgres}"
DB_HOST="${SUPABASE_DB_HOST:-127.0.0.1}"
DB_PORT="${SUPABASE_DB_PORT:-55322}"
DB_USER="${SUPABASE_DB_USER:-postgres}"
DB_NAME="${SUPABASE_DB_NAME:-postgres}"

if [[ -x "/usr/lib/postgresql/17/bin/pg_dump" ]]; then
  PG_DUMP="/usr/lib/postgresql/17/bin/pg_dump"
else
  PG_DUMP="pg_dump"
fi

mkdir -p "${BACKUP_DIR}"

OUT_FILE="${BACKUP_DIR}/service_role_tables_data_${DATE}.sql"

echo "Backing up data (4 tables) -> ${OUT_FILE}"
"${PG_DUMP}" -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" \
  --data-only \
  -t public.service_category \
  -t public.service \
  -t public.app_role \
  -t public.app_role_service \
  -f "${OUT_FILE}"

echo "Done."

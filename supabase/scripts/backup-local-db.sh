#!/usr/bin/env bash
# ローカル Supabase（Docker）の postgres を、スキーマのみ・データのみの2ファイルに分けてバックアップする。
# 使い方: リポジトリルートで ./supabase/scripts/backup-local-db.sh
# 前提: supabase start 済み。pg_dump は DB と同じメジャー版（例: PostgreSQL 17）を推奨。

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# supabase/scripts → リポジトリルート
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
BACKUP_DIR="${REPO_ROOT}/supabase/backups"
DATE="$(date +%Y%m%d)"

export PGPASSWORD="${PGPASSWORD:-postgres}"
DB_HOST="${SUPABASE_DB_HOST:-127.0.0.1}"
DB_PORT="${SUPABASE_DB_PORT:-55322}"
DB_USER="${SUPABASE_DB_USER:-postgres}"
DB_NAME="${SUPABASE_DB_NAME:-postgres}"

# サーバーが PostgreSQL 17 のとき、Ubuntu 既定の pg_dump 16 だと失敗するため 17 を優先
if [[ -x "/usr/lib/postgresql/17/bin/pg_dump" ]]; then
  PG_DUMP="/usr/lib/postgresql/17/bin/pg_dump"
else
  PG_DUMP="pg_dump"
fi

mkdir -p "${BACKUP_DIR}"

SCHEMA_FILE="${BACKUP_DIR}/full_backup_schema_${DATE}.sql"
DATA_FILE="${BACKUP_DIR}/full_backup_data_${DATE}.sql"

echo "Backing up schema -> ${SCHEMA_FILE}"
"${PG_DUMP}" -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" \
  --schema-only \
  -f "${SCHEMA_FILE}"

echo "Backing up data -> ${DATA_FILE}"
"${PG_DUMP}" -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" \
  --data-only \
  -f "${DATA_FILE}"

echo "Done."

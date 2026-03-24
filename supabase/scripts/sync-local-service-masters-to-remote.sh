#!/usr/bin/env bash
# =============================================================================
# ローカル Supabase の 4 テーブル（service_category, service, app_role_service, tenant_service）を
# リモート PostgreSQL にその場でダンプ＆リストアする（ワンショット同期）
# =============================================================================
#
# 必須環境変数:
#   REMOTE_DATABASE_URL  例: postgresql://postgres.[project-ref]:[password]@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres?sslmode=require
#                        （Supabase ダッシュボード Database → Connection string）
#
# 使い方（リポジトリルート）:
#   REMOTE_DATABASE_URL='postgresql://...' ./supabase/scripts/sync-local-service-masters-to-remote.sh
#
# PK 衝突時は restore が失敗する。置き換えが必要なら backup-local-service-tenant-data.sh 冒頭の TRUNCATE 案を参照し、
# 手動で空にしてから再実行する。
#
# app_role は同期しない。tenant_service は先方 tenants に tenant_id があること。

set -euo pipefail

if [[ -z "${REMOTE_DATABASE_URL:-}" ]]; then
  echo "Error: REMOTE_DATABASE_URL が未設定です。" >&2
  echo "例: REMOTE_DATABASE_URL='postgresql://...' $0" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

TMP_SQL="$(mktemp "${TMPDIR:-/tmp}/service_masters_sync.XXXXXX.sql")"
trap 'rm -f "${TMP_SQL}"' EXIT

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

echo "Dumping local (${DB_HOST}:${DB_PORT}) -> temp file"
"${PG_DUMP}" -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" \
  --data-only \
  -t public.service_category \
  -t public.service \
  -t public.app_role_service \
  -t public.tenant_service \
  -f "${TMP_SQL}"

echo "Restoring to remote (ON_ERROR_STOP)"
psql "${REMOTE_DATABASE_URL}" -v ON_ERROR_STOP=1 -f "${TMP_SQL}"

echo "Done."

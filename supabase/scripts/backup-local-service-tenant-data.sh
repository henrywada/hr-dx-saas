#!/usr/bin/env bash
# =============================================================================
# service_category / service / app_role_service / tenant_service のデータのみバックアップ（ローカル Supabase 向け）
# =============================================================================
#
# 【同期の向き】
#   ・ローカル → クラウド: 本スクリプトでダンプ → restore-pgdump-data.sh でクラウド URL へ流す
#   ・クラウド → ローカル: backup-remote-service-tenant-data.sh でクラウドからダンプ → restore でローカル URL
#
# 【PK 衝突・置き換え同期】
#   pg_dump のデータのみリストアは既存 PK とぶつかると失敗する。
#   マスタを「差し替え」する場合は運用で決め、例として次を検討（CASCADE で他テーブルに波及しうる）:
#     TRUNCATE public.tenant_service, public.app_role_service, public.service, public.service_category CASCADE;
#   実行前に必ずバックアップを取ること。
#
# 【app_role】
#   ダンプに含めない。転送先に同一 UUID の app_role 行があること（db push / マイグレーションで揃っている前提）。
#   欠けると app_role_service の FK でリストア失敗。
#
# 【tenant_service】
#   tenant_id は転送先の public.tenants に存在する必要がある。テナント UUID が環境間で異なる場合は tenant_service を同期しないか、
#   テナントデータも揃えてから実行する。
#
# 使い方: リポジトリルートで ./supabase/scripts/backup-local-service-tenant-data.sh
# 前提: supabase start 済み。復元先には既に同一スキーマのテーブルが必要（--data-only のため）。

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
BACKUP_DIR="${REPO_ROOT}/supabase/backups"
DATE="$(date +%Y%m%d_%H%M%S)"

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

OUT_FILE="${BACKUP_DIR}/service_tenant_tables_data_${DATE}.sql"

echo "Backing up data (service_category, service, app_role_service, tenant_service) -> ${OUT_FILE}"
"${PG_DUMP}" -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" \
  --data-only \
  -t public.service_category \
  -t public.service \
  -t public.app_role_service \
  -t public.tenant_service \
  -f "${OUT_FILE}"

echo "Done."

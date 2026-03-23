#!/bin/bash
# =============================================================================
# バックアップからのデータ復旧スクリプト
# 使用方法: ./scripts/restore_from_backup.sh [バックアップフォルダ]
# 例: ./scripts/restore_from_backup.sh backups/backup_20260316_123956
# =============================================================================
set -e

BACKUP_DIR="${1:-backups/backup_20260316_123956}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

if [ ! -d "$BACKUP_DIR" ]; then
  echo "エラー: バックアップフォルダが見つかりません: $BACKUP_DIR"
  echo "利用可能なバックアップ:"
  ls -d backups/backup_* 2>/dev/null || true
  exit 1
fi

DATA_FILE="$BACKUP_DIR/data.sql"
if [ ! -f "$DATA_FILE" ]; then
  echo "エラー: data.sql が見つかりません: $DATA_FILE"
  exit 1
fi

echo "=============================================="
echo "バックアップからの復旧"
echo "バックアップ: $BACKUP_DIR"
echo "=============================================="

# 1. Supabase が起動しているか確認
if ! supabase status 2>/dev/null | grep -q "API URL"; then
  echo ""
  echo "Supabase が起動していません。先に以下を実行してください:"
  echo "  supabase start"
  exit 1
fi

# 2. スキーマをリセット（シードは実行しない）
echo ""
echo "Step 1: スキーマをリセットしています（--no-seed）..."
supabase db reset --no-seed

# 3. 競合するテーブルを TRUNCATE（マイグレーションで投入したマスタとバックアップの競合を解消）
echo ""
echo "Step 2: 復元対象テーブルをクリアしています..."
docker exec -i supabase_db_hr-dx-saas psql -U postgres -d postgres -c "
TRUNCATE TABLE auth.refresh_tokens CASCADE;
TRUNCATE TABLE auth.mfa_amr_claims CASCADE;
TRUNCATE TABLE auth.sessions CASCADE;
TRUNCATE TABLE auth.identities CASCADE;
TRUNCATE TABLE auth.users CASCADE;
TRUNCATE TABLE auth.audit_log_entries CASCADE;
TRUNCATE TABLE public.app_role_service CASCADE;
TRUNCATE TABLE public.app_role CASCADE;
TRUNCATE TABLE public.service CASCADE;
TRUNCATE TABLE public.service_category CASCADE;
TRUNCATE TABLE public.tenant_service CASCADE;
TRUNCATE TABLE public.tenants CASCADE;
TRUNCATE TABLE public.access_logs CASCADE;
TRUNCATE TABLE public.ai_usage_logs CASCADE;
TRUNCATE TABLE public.candidate_pulses CASCADE;
TRUNCATE TABLE public.divisions CASCADE;
TRUNCATE TABLE public.job_postings CASCADE;
TRUNCATE TABLE public.recruitment_jobs CASCADE;
TRUNCATE TABLE public.stress_check_periods CASCADE;
TRUNCATE TABLE public.stress_check_high_stress_criteria CASCADE;
TRUNCATE TABLE public.stress_check_questions CASCADE;
TRUNCATE TABLE public.stress_check_response_options CASCADE;
TRUNCATE TABLE public.stress_check_responses CASCADE;
TRUNCATE TABLE public.stress_check_scale_conversions CASCADE;
TRUNCATE TABLE public.stress_check_submissions CASCADE;
TRUNCATE TABLE public.survey_questions CASCADE;
TRUNCATE TABLE public.survey_responses CASCADE;
" 2>/dev/null || true

# 4. バックアップのデータを投入
echo ""
echo "Step 3: バックアップデータを投入しています..."
docker exec -i supabase_db_hr-dx-saas psql -U postgres -d postgres -v ON_ERROR_STOP=1 < "$DATA_FILE"

# 5. stress_check_results の再計算（responses + submissions から採点）
echo ""
echo "Step 4: stress_check_results を再計算しています..."
if npm run recalculate-stress-results 2>/dev/null; then
  echo "  stress_check_results の再計算が完了しました。"
else
  echo "  再計算をスキップしました（npm run recalculate-stress-results を手動で実行してください）"
fi

echo ""
echo "=============================================="
echo "復旧が完了しました。"
echo "=============================================="

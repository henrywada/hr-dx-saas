#!/bin/bash
# =============================================================================
# バックアップから Users（auth スキーマ）を除いたデータのみを復元する
#
# 使用方法: ./scripts/restore_data_exclude_users.sh [バックアップフォルダ]
# 例: ./scripts/restore_data_exclude_users.sh backups/backup_20260316_123956
# =============================================================================
set -e

BACKUP_DIR="${1:-backups/backup_20260316_123956}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

if [ ! -d "$BACKUP_DIR" ]; then
  echo "エラー: バックアップフォルダが見つかりません: $BACKUP_DIR"
  exit 1
fi

echo "=============================================="
echo "データ復元（Users 除く）"
echo "バックアップ: $BACKUP_DIR"
echo "=============================================="

# 1. Supabase が起動しているか確認
if ! supabase status 2>/dev/null | grep -qE "API URL|Project URL"; then
  echo ""
  echo "Supabase が起動していません。先に supabase start を実行してください。"
  exit 1
fi

# 2. フィルタ済み SQL を生成（auth スキーマを除外、employees/access_logs の user_id を NULL に）
echo ""
echo "Step 1: フィルタ済み SQL を生成しています..."
node scripts/restore_data_exclude_users.js "$BACKUP_DIR"

DATA_FILE="$BACKUP_DIR/data_no_auth.sql"
if [ ! -f "$DATA_FILE" ]; then
  echo "エラー: data_no_auth.sql の生成に失敗しました"
  exit 1
fi

# 3. 復元対象テーブルを TRUNCATE（auth は触れない）
echo ""
echo "Step 2: 復元対象テーブルをクリアしています..."
docker exec -i supabase_db_hr-dx-saas psql -U postgres -d postgres -c "
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
TRUNCATE TABLE public.stress_check_results CASCADE;
TRUNCATE TABLE public.stress_check_interviews CASCADE;
TRUNCATE TABLE public.survey_questions CASCADE;
TRUNCATE TABLE public.survey_responses CASCADE;
TRUNCATE TABLE public.employees CASCADE;
" 2>/dev/null || true

# マイグレーションで追加されたテーブルもクリア
docker exec -i supabase_db_hr-dx-saas psql -U postgres -d postgres -c "
TRUNCATE TABLE IF EXISTS public.announcements CASCADE;
TRUNCATE TABLE IF EXISTS public.pulse_survey_periods CASCADE;
TRUNCATE TABLE IF EXISTS public.service_assignments CASCADE;
TRUNCATE TABLE IF EXISTS public.service_assignments_users CASCADE;
TRUNCATE TABLE IF EXISTS public.program_targets CASCADE;
TRUNCATE TABLE IF EXISTS public.workplace_improvement_plans CASCADE;
TRUNCATE TABLE IF EXISTS public.stress_interview_records CASCADE;
" 2>/dev/null || true

# 4. フィルタ済みデータを投入
echo ""
echo "Step 3: データを投入しています..."
docker exec -i supabase_db_hr-dx-saas psql -U postgres -d postgres -v ON_ERROR_STOP=1 < "$DATA_FILE"

# 5. stress_check_results の再計算（3/16 バックアップは results が空の可能性あり）
echo ""
echo "Step 4: stress_check_results を再計算しています..."
if npm run recalculate-stress-results 2>/dev/null; then
  echo "  stress_check_results の再計算が完了しました。"
else
  echo "  再計算をスキップしました（必要に応じて npm run recalculate-stress-results を手動実行）"
fi

echo ""
echo "=============================================="
echo "復元が完了しました。（auth.users は変更していません）"
echo "=============================================="

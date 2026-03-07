#!/bin/bash
# ============================================================
# マイグレーション適用スクリプト（既存データ保持）
# 復元したDBに未反映のマイグレーションを適用
# ============================================================

set -e

PROJECT_DIR="/home/hr-dx/ai-projects/hr-dx-saas"
MIGRATIONS_DIR="$PROJECT_DIR/supabase/migrations"

DB_CONTAINER=$(docker ps --format '{{.Names}}' | grep 'supabase_db' | head -1)
if [ -z "$DB_CONTAINER" ]; then
    echo "エラー: Supabase DBコンテナが見つかりません"
    exit 1
fi
echo "✓ コンテナ: $DB_CONTAINER"

echo ""
echo "[1/2] recruitment_ai_base マイグレーション適用中..."
docker cp "$MIGRATIONS_DIR/20260222110000_add_recruitment_ai_base.sql" "$DB_CONTAINER:/tmp/mig1.sql"
docker exec "$DB_CONTAINER" psql -U postgres -d postgres -f /tmp/mig1.sql 2>&1
echo "✓ 完了"

echo ""
echo "[2/2] recreate_access_logs マイグレーション適用中..."
docker cp "$MIGRATIONS_DIR/20260223020000_recreate_access_logs.sql" "$DB_CONTAINER:/tmp/mig2.sql"
docker exec "$DB_CONTAINER" psql -U postgres -d postgres -f /tmp/mig2.sql 2>&1
echo "✓ 完了"

# クリーンアップ
docker exec "$DB_CONTAINER" rm -f /tmp/mig1.sql /tmp/mig2.sql

echo ""
echo "============================================"
echo "  ✅ マイグレーション適用完了！"
echo "============================================"

# 確認
echo ""
echo "テーブル一覧:"
docker exec "$DB_CONTAINER" psql -U postgres -d postgres -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;"

echo ""
echo "tenants カラム確認:"
docker exec "$DB_CONTAINER" psql -U postgres -d postgres -c "SELECT column_name, data_type, column_default FROM information_schema.columns WHERE table_name = 'tenants' AND column_name IN ('plan_type', 'max_employees');"

echo ""
echo "recruitment_jobs RLSポリシー:"
docker exec "$DB_CONTAINER" psql -U postgres -d postgres -c "SELECT policyname FROM pg_policies WHERE tablename = 'recruitment_jobs';"

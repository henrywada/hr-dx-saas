#!/bin/bash
# ============================================================
# Supabase復元スクリプト (supabase db reset版)
# バックアップ: /backups/backup_20260221_222936
# ============================================================

set -e

PROJECT_DIR="/home/hr-dx/ai-projects/hr-dx-saas"
BACKUP_DIR="$PROJECT_DIR/backups/backup_20260221_222936"
SCHEMA_FILE="$BACKUP_DIR/schema.sql"
DATA_FILE="$BACKUP_DIR/data.sql"
MIGRATIONS_DIR="$PROJECT_DIR/supabase/migrations"
MIGRATIONS_BACKUP="$PROJECT_DIR/supabase/migrations_backup_tmp"

echo "============================================"
echo "  Supabase完全復元"
echo "  バックアップ: backup_20260221_222936"
echo "============================================"

# 1. マイグレーションファイルを一時退避
echo ""
echo "[1/6] マイグレーションファイルを一時退避中..."
if [ -d "$MIGRATIONS_DIR" ]; then
    mkdir -p "$MIGRATIONS_BACKUP"
    mv "$MIGRATIONS_DIR"/*.sql "$MIGRATIONS_BACKUP/" 2>/dev/null || true
    echo "  ✓ マイグレーション退避完了"
else
    echo "  → マイグレーションなし、スキップ"
fi

# 2. supabase db reset で完全リセット
echo ""
echo "[2/6] supabase db reset で完全リセット中..."
cd "$PROJECT_DIR"
supabase db reset --no-seed
echo "  ✓ DB完全リセット完了"

# 3. DBコンテナ検出
echo ""
echo "[3/6] DBコンテナ検出中..."
DB_CONTAINER=$(docker ps --format '{{.Names}}' | grep 'supabase_db' | head -1)
if [ -z "$DB_CONTAINER" ]; then
    echo "エラー: DBコンテナが見つかりません"
    # マイグレーション復元
    mv "$MIGRATIONS_BACKUP"/*.sql "$MIGRATIONS_DIR/" 2>/dev/null || true
    rmdir "$MIGRATIONS_BACKUP" 2>/dev/null || true
    exit 1
fi
echo "  ✓ コンテナ: $DB_CONTAINER"

# 4. バックアップファイルをコピーして適用
echo ""
echo "[4/6] スキーマ復元中 (テーブル定義・RLS・関数・権限)..."
docker cp "$SCHEMA_FILE" "$DB_CONTAINER:/tmp/schema.sql"
docker exec "$DB_CONTAINER" psql -U postgres -d postgres -f /tmp/schema.sql 2>&1 | grep -i "error" || true
echo "  ✓ スキーマ復元完了"

# 5. データ復元
echo ""
echo "[5/6] データ復元中 (auth + publicデータ)..."
docker cp "$DATA_FILE" "$DB_CONTAINER:/tmp/data.sql"
docker exec "$DB_CONTAINER" psql -U postgres -d postgres -f /tmp/data.sql 2>&1 | grep -i "error" || true
echo "  ✓ データ復元完了"

# クリーンアップ
docker exec "$DB_CONTAINER" rm -f /tmp/schema.sql /tmp/data.sql

# 6. マイグレーションファイルを元に戻す
echo ""
echo "[6/6] マイグレーションファイルを復元中..."
if [ -d "$MIGRATIONS_BACKUP" ]; then
    mv "$MIGRATIONS_BACKUP"/*.sql "$MIGRATIONS_DIR/" 2>/dev/null || true
    rmdir "$MIGRATIONS_BACKUP" 2>/dev/null || true
    echo "  ✓ マイグレーション復元完了"
fi

echo ""
echo "============================================"
echo "  ✅ Supabase完全復元完了！"
echo "============================================"
echo ""

# 確認
echo "復元されたテーブル:"
docker exec "$DB_CONTAINER" psql -U postgres -d postgres -c \
  "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;"

echo ""
echo "authユーザー数:"
docker exec "$DB_CONTAINER" psql -U postgres -d postgres -c \
  "SELECT count(*) as user_count FROM auth.users;"

echo ""
echo "RLSポリシー数:"
docker exec "$DB_CONTAINER" psql -U postgres -d postgres -c \
  "SELECT count(*) as policy_count FROM pg_policies WHERE schemaname = 'public';"

echo ""
echo "関数一覧:"
docker exec "$DB_CONTAINER" psql -U postgres -d postgres -c \
  "SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public';"

#!/bin/bash

# ローカルDBからアンケートテーブルのデータをエクスポート
# 既存データを保護しながら安全に移行

echo "=== ローカルDB → クラウドSupabase データ移行スクリプト ==="
echo ""

# ローカルDB接続情報
LOCAL_DB="postgresql://postgres:postgres@127.0.0.1:55422/postgres"

# クラウドSupabase接続情報（要設定）
# .env.localから NEXT_PUBLIC_SUPABASE_URL を元に接続
CLOUD_DB="${CLOUD_DATABASE_URL}"

if [ -z "$CLOUD_DATABASE_URL" ]; then
  echo "❌ エラー: CLOUD_DATABASE_URL が設定されていません。"
  echo ""
  echo "以下の情報を.envファイルに追加してください："
  echo "CLOUD_DATABASE_URL=postgresql://[user]:[password]@[host]:[port]/[database]"
  echo ""
  exit 1
fi

echo "✅ ローカルDB (ローカルSupa に接続します..."
echo ""

# Step 1: ローカルからアンケートテーブルのみをエクスポート（データのみ）
echo "📊 Step 1: ローカルDB からデータをエクスポート中..."
pg_dump "$LOCAL_DB" \
  --data-only \
  -t public.questionnaires \
  -t public.questionnaire_sections \
  -t public.questionnaire_questions \
  -t public.questionnaire_question_options \
  -t public.questionnaire_question_items \
  -t public.questionnaire_assignments \
  -t public.questionnaire_responses \
  -t public.questionnaire_answers \
  > /tmp/questionnaire_migration.sql

if [ $? -ne 0 ]; then
  echo "❌ ローカルDB からのエクスポートに失敗しました。"
  exit 1
fi

echo "✅ エクスポート完了: /tmp/questionnaire_migration.sql"
echo ""

# Step 2: クラウドSupabaseに既存データ保護の上でインポート
echo "🌐 Step 2: クラウドSupabase にデータをインポート中..."
psql "$CLOUD_DATABASE_URL" < /tmp/questionnaire_migration.sql

if [ $? -ne 0 ]; then
  echo "❌ クラウドSupabase へのインポートに失敗しました。"
  exit 1
fi

echo "✅ インポート完了!"
echo ""

# Step 3: データ件数確認
echo "📈 Step 3: 移行されたデータ件数を確認..."
echo ""
echo "【ローカルDB のデータ件数】"
psql "$LOCAL_DB" -c "
SELECT 'questionnaires' as テーブル, COUNT(*) as 件数 FROM public.questionnaires
UNION ALL
SELECT 'questionnaire_sections', COUNT(*) FROM public.questionnaire_sections
UNION ALL
SELECT 'questionnaire_questions', COUNT(*) FROM public.questionnaire_questions
UNION ALL
SELECT 'questionnaire_question_options', COUNT(*) FROM public.questionnaire_question_options
UNION ALL
SELECT 'questionnaire_question_items', COUNT(*) FROM public.questionnaire_question_items
UNION ALL
SELECT 'questionnaire_assignments', COUNT(*) FROM public.questionnaire_assignments
UNION ALL
SELECT 'questionnaire_responses', COUNT(*) FROM public.questionnaire_responses
UNION ALL
SELECT 'questionnaire_answers', COUNT(*) FROM public.questionnaire_answers
ORDER BY テーブル;
"

echo ""
echo "【クラウドSupabase のデータ件数】"
psql "$CLOUD_DATABASE_URL" -c "
SELECT 'questionnaires' as テーブル, COUNT(*) as 件数 FROM public.questionnaires
UNION ALL
SELECT 'questionnaire_sections', COUNT(*) FROM public.questionnaire_sections
UNION ALL
SELECT 'questionnaire_questions', COUNT(*) FROM public.questionnaire_questions
UNION ALL
SELECT 'questionnaire_question_options', COUNT(*) FROM public.questionnaire_question_options
UNION ALL
SELECT 'questionnaire_question_items', COUNT(*) FROM public.questionnaire_question_items
UNION ALL
SELECT 'questionnaire_assignments', COUNT(*) FROM public.questionnaire_assignments
UNION ALL
SELECT 'questionnaire_responses', COUNT(*) FROM public.questionnaire_responses
UNION ALL
SELECT 'questionnaire_answers', COUNT(*) FROM public.questionnaire_answers
ORDER BY テーブル;
"

echo ""
echo "================================"
echo "✅ データ移行が完了しました！"
echo "================================"
echo ""
echo "次のステップ:"
echo "1. クラウドSupabase で RLS ポリシーが正しく設定されていることを確認"
echo "2. 本番環境でテスト実施"
echo ""

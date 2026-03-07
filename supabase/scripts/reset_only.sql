-- ============================================================
-- ストレスチェック テストデータリセット（簡易版）
-- ============================================================
-- Supabase SQL Editor にそのまま貼り付けて実行してください
-- ============================================================

-- テストデータのリセット（再受検可能にする）
DELETE FROM public.stress_check_results;
DELETE FROM public.stress_check_submissions;
DELETE FROM public.stress_check_responses;

-- 確認
SELECT 'results' AS tbl, count(*) AS cnt FROM public.stress_check_results
UNION ALL SELECT 'submissions', count(*) FROM public.stress_check_submissions
UNION ALL SELECT 'responses', count(*) FROM public.stress_check_responses;

-- 期待: 全て 0

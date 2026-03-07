-- ============================================================
-- ストレスチェック テストデータリセットSQL
-- ============================================================
-- 目的: 不正な採点結果のテストデータを削除し、
--       再テスト（再受検）できる状態にリセットする
-- ============================================================
-- 実行場所: Supabase SQL Editor（service_role権限）
-- ============================================================

-- 1. テスト結果の削除（stress_check_results）
DELETE FROM public.stress_check_results;

-- 2. 提出記録の削除（stress_check_submissions）
--    → これにより checkExistingResponse が false を返し、再受検可能になる
DELETE FROM public.stress_check_submissions;

-- 3. 回答データの削除（stress_check_responses）
DELETE FROM public.stress_check_responses;

-- 確認
SELECT 'stress_check_results' as table_name, count(*) as remaining FROM public.stress_check_results
UNION ALL
SELECT 'stress_check_submissions', count(*) FROM public.stress_check_submissions
UNION ALL
SELECT 'stress_check_responses', count(*) FROM public.stress_check_responses;

-- ============================================================
-- 上記を実行後、ブラウザで /stress-check にアクセスすれば
-- 回答フォームが表示され、再テストが可能です。
-- ============================================================

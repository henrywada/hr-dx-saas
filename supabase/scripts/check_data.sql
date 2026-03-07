-- ============================================================
-- 回答データの存在確認（受検完了後に実行）
-- ============================================================
-- RLS をバイパスして確認するため、service_role で実行してください
-- Supabase SQL Editor はデフォルトで service_role です
-- ============================================================

-- 1. responses テーブルのデータ確認
SELECT
  r.employee_id,
  r.period_id,
  r.tenant_id,
  count(*) AS response_count,
  min(r.answered_at) AS first_answered,
  max(r.answered_at) AS last_answered
FROM public.stress_check_responses r
GROUP BY r.employee_id, r.period_id, r.tenant_id
ORDER BY last_answered DESC
LIMIT 10;

-- 2. submissions テーブルのデータ確認
SELECT * FROM public.stress_check_submissions
ORDER BY submitted_at DESC
LIMIT 10;

-- 3. results テーブルのデータ確認
SELECT * FROM public.stress_check_results
ORDER BY created_at DESC
LIMIT 10;

-- 4. employees テーブルの employee_id と user_id の対応確認
SELECT id AS employee_id, user_id, display_name, tenant_id
FROM public.employees
ORDER BY created_at DESC
LIMIT 10;

-- 5. current_employee_id() と current_tenant_id() の動作確認
-- ※ SQL Editor(service_role) では NULL になる可能性が高い
SELECT
  public.current_tenant_id() AS current_tenant,
  public.current_employee_id() AS current_employee;

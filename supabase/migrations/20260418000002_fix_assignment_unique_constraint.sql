-- 旧ユニーク制約（questionnaire_id + employee_id）を削除
-- period_id を導入したことで、同一従業員が複数期間にアサイン可能とする
ALTER TABLE public.questionnaire_assignments
  DROP CONSTRAINT IF EXISTS questionnaire_assignments_questionnaire_id_employee_id_key;

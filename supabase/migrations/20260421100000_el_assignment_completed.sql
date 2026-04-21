-- el_assignments に修了日時カラムを追加
-- コース修了判定を el_progress 全件照合なしで行うため

ALTER TABLE public.el_assignments
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- 従業員IDでのアサイン検索を高速化
CREATE INDEX IF NOT EXISTS idx_el_assignments_employee_id
  ON public.el_assignments(employee_id);

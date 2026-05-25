-- employee_approvers に approver_role を追加
-- 既存レコードは 'skill_approval' として保持しつつ、評価フロー用ロールを追加できるようにする

ALTER TABLE public.employee_approvers
  ADD COLUMN IF NOT EXISTS approver_role TEXT NOT NULL DEFAULT 'skill_approval'
    CHECK (approver_role IN (
      'skill_approval',   -- スキル承認（直属上司）
      'eval_primary',     -- 一次評価者
      'eval_secondary',   -- 二次評価者
      'eval_confirmer'    -- 確定者（最終承認）
    ));

-- 既存の UNIQUE 制約を削除し、approver_role を含む形に再定義
-- (同一ペアで複数ロールを持てるよう変更)
ALTER TABLE public.employee_approvers
  DROP CONSTRAINT IF EXISTS employee_approvers_tenant_id_employee_id_approver_id_key;

ALTER TABLE public.employee_approvers
  ADD CONSTRAINT employee_approvers_unique_role
    UNIQUE (tenant_id, employee_id, approver_id, approver_role);

COMMENT ON COLUMN public.employee_approvers.approver_role IS
  'skill_approval=スキル承認, eval_primary=一次評価者, eval_secondary=二次評価者, eval_confirmer=確定者';

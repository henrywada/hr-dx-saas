-- 個人宛てアドバイス機能: task_comments に宛先列と、責任者→タスク責任者→メンバーの
-- 一方向送信権限を追加する。
-- 依存: supabase/migrations/20260907032410_create_task_management_tables.sql の
-- is_task_group_owner() / is_task_group_manager()
-- 依存: supabase/migrations/20260907135655_create_task_comments_table.sql の
-- can_comment_on_task() / can_comment_on_task_group()
-- 背景: docs/implementation-plan-task-management.md セクション19.2（Phase 4・要求15）

ALTER TABLE public.task_comments
  ADD COLUMN IF NOT EXISTS target_employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.task_comments.target_employee_id IS
  '宛先従業員（comment_type=adviceのときのみ必須）。運用概念図の「責任者/タスク責任者→個人」への一方向アドバイスを表す';

ALTER TABLE public.task_comments
  ADD CONSTRAINT task_comments_advice_requires_target
  CHECK (
    (comment_type = 'advice' AND target_employee_id IS NOT NULL)
    OR (comment_type <> 'advice' AND target_employee_id IS NULL)
  );

-- 任意の従業員が指定タスクグループのマネージャー/メンバーかどうかを判定する汎用版
-- （既存の is_task_group_manager/is_task_group_member は暗黙に current_employee_id() を
--  対象とするため、宛先=第三者を検査するにはこの汎用版が必要）
CREATE OR REPLACE FUNCTION public.is_employee_task_group_manager(p_task_group_id UUID, p_employee_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.task_group_managers m
    WHERE m.task_group_id = p_task_group_id AND m.employee_id = p_employee_id
  );
$$;

COMMENT ON FUNCTION public.is_employee_task_group_manager(UUID, UUID) IS '指定した従業員が指定したタスクグループのマネージャーかどうか（任意の従業員を検査できる汎用版）';

CREATE OR REPLACE FUNCTION public.is_employee_task_group_member(p_task_group_id UUID, p_employee_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.task_group_members m
    WHERE m.task_group_id = p_task_group_id AND m.employee_id = p_employee_id
  );
$$;

COMMENT ON FUNCTION public.is_employee_task_group_member(UUID, UUID) IS '指定した従業員が指定したタスクグループのメンバーかどうか（任意の従業員を検査できる汎用版）';

-- アドバイス送信権限: 責任者→タスク責任者(マネージャー)、タスク責任者(マネージャー)→メンバー の一方向のみ。
-- マネージャー不在のグループでは責任者からメンバーへの直接送信はできない（意図的な制約、PRDセクション19.2参照）
CREATE OR REPLACE FUNCTION public.can_send_advice(p_task_group_id UUID, p_target_employee_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (
      public.is_task_group_owner(p_task_group_id)
      AND public.is_employee_task_group_manager(p_task_group_id, p_target_employee_id)
    )
    OR
    (
      public.is_task_group_manager(p_task_group_id)
      AND public.is_employee_task_group_member(p_task_group_id, p_target_employee_id)
    );
$$;

COMMENT ON FUNCTION public.can_send_advice(UUID, UUID) IS 'ログインユーザーが指定した従業員にアドバイスを送信できるか（責任者→タスク責任者、タスク責任者→メンバーの一方向のみ）';

-- task_comments_insert ポリシーを、advice種別のときのみ can_send_advice を追加適用する形に置き換える
DROP POLICY IF EXISTS "task_comments_insert" ON public.task_comments;
CREATE POLICY "task_comments_insert" ON public.task_comments
  FOR INSERT WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND employee_id = public.current_employee_id()
    AND (
      (task_group_id IS NOT NULL AND public.can_comment_on_task_group(task_group_id))
      OR (task_id IS NOT NULL AND public.can_comment_on_task(task_id))
    )
    AND (
      comment_type <> 'advice'
      OR (
        target_employee_id IS NOT NULL
        AND public.can_send_advice(
          COALESCE(
            task_group_id,
            (SELECT t.task_group_id FROM public.tasks t WHERE t.id = task_id)
          ),
          target_employee_id
        )
      )
    )
  );

COMMENT ON POLICY "task_comments_insert" ON public.task_comments IS
  '投稿者は自分自身。対象（タスク/タスクグループ）への投稿権限に加え、comment_type=adviceの場合はcan_send_adviceによる宛先制限を追加適用する';

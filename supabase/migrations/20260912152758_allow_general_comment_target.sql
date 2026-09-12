-- 「コメント」(general) でも宛先(target_employee_id)を付けられるようにする。
-- 背景: UI で general を「コメント」に改名し、目標責任者・タスクメンバーへの宛先必須化した。
-- 旧制約 task_comments_directed_types_require_target は
--   comment_type='general' ⇒ target_employee_id IS NULL
-- だったため、宛先付き general の INSERT が CHECK 23514 で失敗していた。
--
-- 依存: 20260911100100_extend_task_comments_targets.sql
--       （task_comments_directed_types_require_target / is_employee_task_group_owner /
--        can_send_suggestion / task_group_id_for_task）
-- 依存: 20260911100000_add_task_assignees_role.sql（task_assignees.role）
--
-- ローカル適用: supabase migration up（db reset は使わない）
-- 呼び出し元: src/features/task-management/actions.ts の createComment（task_comments INSERT）

-- 1. CHECK: general は宛先あり/なしの両方を許容（過去の宛先なし行を壊さない）
ALTER TABLE public.task_comments
  DROP CONSTRAINT IF EXISTS task_comments_directed_types_require_target;

ALTER TABLE public.task_comments
  ADD CONSTRAINT task_comments_directed_types_require_target
  CHECK (
    (comment_type IN ('advice', 'suggestion', 'report') AND target_employee_id IS NOT NULL)
    OR (comment_type = 'general')
  );

COMMENT ON CONSTRAINT task_comments_directed_types_require_target ON public.task_comments IS
  'advice/suggestion/report は宛先必須。general（コメント）は宛先あり/なし両方可（新規UIは宛先必須、過去行は NULL）';

-- 2. can_send_general: 宛先が目標責任者、または当該タスクのメンバー(role=member)
CREATE OR REPLACE FUNCTION public.can_send_general(
  p_task_id UUID,
  p_task_group_id UUID,
  p_target_employee_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    CASE
      WHEN p_task_id IS NOT NULL THEN (
        public.is_employee_task_group_owner(
          public.task_group_id_for_task(p_task_id),
          p_target_employee_id
        )
        OR EXISTS (
          SELECT 1
          FROM public.task_assignees a
          WHERE a.task_id = p_task_id
            AND a.employee_id = p_target_employee_id
            AND a.role = 'member'
        )
      )
      WHEN p_task_group_id IS NOT NULL THEN (
        public.is_employee_task_group_owner(p_task_group_id, p_target_employee_id)
        OR public.is_employee_task_group_member(p_task_group_id, p_target_employee_id)
      )
      ELSE FALSE
    END;
$$;

COMMENT ON FUNCTION public.can_send_general(UUID, UUID, UUID) IS
  'ログインユーザーが general（コメント）の宛先として指定した従業員が妥当か（目標責任者、またはタスク/グループのメンバー）';

-- 3. can_send_suggestion: 責任者・オーナー → タスクメンバー も許可（Phase5 UI）
CREATE OR REPLACE FUNCTION public.can_send_suggestion(p_task_group_id UUID, p_target_employee_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (
      public.is_task_group_member(p_task_group_id)
      AND public.is_employee_task_group_manager(p_task_group_id, p_target_employee_id)
    )
    OR
    (
      public.is_task_group_manager(p_task_group_id)
      AND public.is_employee_task_group_owner(p_task_group_id, p_target_employee_id)
    )
    OR
    (
      (public.is_task_group_manager(p_task_group_id) OR public.is_task_group_owner(p_task_group_id))
      AND EXISTS (
        SELECT 1
        FROM public.task_assignees a
        JOIN public.tasks t ON t.id = a.task_id
        WHERE t.task_group_id = p_task_group_id
          AND a.employee_id = p_target_employee_id
          AND a.role = 'member'
      )
    );
$$;

COMMENT ON FUNCTION public.can_send_suggestion(UUID, UUID) IS
  '提案(suggestion)送信可否。メンバー→責任者、責任者→オーナー、責任者/オーナー→タスクメンバー';

-- 4. RLS: general に宛先がある場合は can_send_general を適用
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
      (
        comment_type = 'general'
        AND (
          target_employee_id IS NULL
          OR public.can_send_general(task_id, task_group_id, target_employee_id)
        )
      )
      OR (comment_type = 'advice' AND target_employee_id IS NOT NULL
          AND public.can_send_advice(COALESCE(task_group_id, public.task_group_id_for_task(task_id)), target_employee_id))
      OR (comment_type = 'suggestion' AND target_employee_id IS NOT NULL
          AND public.can_send_suggestion(COALESCE(task_group_id, public.task_group_id_for_task(task_id)), target_employee_id))
      OR (comment_type = 'report' AND target_employee_id IS NOT NULL
          AND public.can_send_report(COALESCE(task_group_id, public.task_group_id_for_task(task_id)), target_employee_id))
    )
  );

COMMENT ON POLICY "task_comments_insert" ON public.task_comments IS
  '投稿者は自分自身。advice/suggestion/report は各送信可否関数、general は宛先ありのとき can_send_general を適用';

DROP POLICY IF EXISTS "task_comments_update" ON public.task_comments;
CREATE POLICY "task_comments_update" ON public.task_comments
  FOR UPDATE
  USING (tenant_id = public.current_tenant_id() AND employee_id = public.current_employee_id())
  WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND employee_id = public.current_employee_id()
    AND (
      (task_group_id IS NOT NULL AND public.can_comment_on_task_group(task_group_id))
      OR (task_id IS NOT NULL AND public.can_comment_on_task(task_id))
    )
    AND (
      (
        comment_type = 'general'
        AND (
          target_employee_id IS NULL
          OR public.can_send_general(task_id, task_group_id, target_employee_id)
        )
      )
      OR (comment_type = 'advice' AND target_employee_id IS NOT NULL
          AND public.can_send_advice(COALESCE(task_group_id, public.task_group_id_for_task(task_id)), target_employee_id))
      OR (comment_type = 'suggestion' AND target_employee_id IS NOT NULL
          AND public.can_send_suggestion(COALESCE(task_group_id, public.task_group_id_for_task(task_id)), target_employee_id))
      OR (comment_type = 'report' AND target_employee_id IS NOT NULL
          AND public.can_send_report(COALESCE(task_group_id, public.task_group_id_for_task(task_id)), target_employee_id))
    )
  );

COMMENT ON POLICY "task_comments_update" ON public.task_comments IS
  '投稿者本人のみ更新可。task_comments_insert と同一の権限チェック（UPDATE経由バイパス防止）';

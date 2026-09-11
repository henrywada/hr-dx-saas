-- task_comments の宛先必須制約とRLSを advice のみから suggestion/report にも拡張する。
-- 依存: supabase/migrations/20260907032410_create_task_management_tables.sql の
-- is_task_group_manager() / is_task_group_member() / task_groups / task_milestones / task_objectives
-- 依存: supabase/migrations/20260910100100_add_task_comments_advice_target.sql の
-- can_send_advice() / is_employee_task_group_manager() / is_employee_task_group_member() /
-- task_group_id_for_task()
-- 背景: docs/implementation-plan-task-management.md セクション4（Phase 5）
--   suggestion: メンバー→タスク責任者(マネージャー) または タスク責任者(マネージャー)→目標責任者(オーナー) の両方向
--   report: タスク責任者(マネージャー)→目標責任者(オーナー) のみ
--
-- 過去の実績（20260910100500_harden_task_comments_update_advice_check.sql）を踏まえ、
-- task_comments_insert / task_comments_update の WITH CHECK は
-- USING句の有無以外は完全に同一の条件にする（UPDATE経由での権限バイパスを防ぐため）。

-- 1. 宛先必須の対象を advice だけでなく suggestion / report にも広げる
ALTER TABLE public.task_comments
  DROP CONSTRAINT IF EXISTS task_comments_advice_requires_target;

ALTER TABLE public.task_comments
  ADD CONSTRAINT task_comments_directed_types_require_target
  CHECK (
    (comment_type IN ('advice', 'suggestion', 'report') AND target_employee_id IS NOT NULL)
    OR (comment_type = 'general' AND target_employee_id IS NULL)
  );

-- 2. is_employee_task_group_owner: 任意の従業員がそのタスクグループの目標責任者かを判定
--    （既存の is_employee_task_group_manager / is_employee_task_group_member と対称なヘルパー）
--    ※ can_send_suggestion / can_send_report から参照されるため、それらより先に定義する
--    （LANGUAGE sql の関数は CREATE FUNCTION 時点で参照先の存在チェックが行われるため、
--      ブリーフ記載の順序のままだと「function does not exist」で適用に失敗する）
CREATE OR REPLACE FUNCTION public.is_employee_task_group_owner(p_task_group_id UUID, p_employee_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.task_groups g
    JOIN public.task_milestones ms ON ms.id = g.milestone_id
    JOIN public.task_objectives o ON o.id = ms.objective_id
    WHERE g.id = p_task_group_id AND o.owner_employee_id = p_employee_id
  );
$$;

COMMENT ON FUNCTION public.is_employee_task_group_owner(UUID, UUID) IS '指定した従業員が指定したタスクグループが属する目標の責任者かどうか（任意の従業員を検査できる汎用版）';

-- 3. suggestion: メンバー→マネージャー、または マネージャー→オーナー の両方向
CREATE OR REPLACE FUNCTION public.can_send_suggestion(p_task_group_id UUID, p_target_employee_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
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
    );
$$;

COMMENT ON FUNCTION public.can_send_suggestion(UUID, UUID) IS 'ログインユーザーが指定した従業員に提案(suggestion)を送信できるか（メンバー→タスク責任者、タスク責任者→目標責任者の両方向）';

-- 4. report: マネージャー→オーナー のみ
CREATE OR REPLACE FUNCTION public.can_send_report(p_task_group_id UUID, p_target_employee_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    public.is_task_group_manager(p_task_group_id)
    AND public.is_employee_task_group_owner(p_task_group_id, p_target_employee_id);
$$;

COMMENT ON FUNCTION public.can_send_report(UUID, UUID) IS 'ログインユーザーが指定した従業員に報告(report)を送信できるか（タスク責任者→目標責任者の一方向のみ）';

-- 5. task_comments_insert / task_comments_update に suggestion / report の権限チェックを追加
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
      comment_type = 'general'
      OR (comment_type = 'advice' AND target_employee_id IS NOT NULL
          AND public.can_send_advice(COALESCE(task_group_id, public.task_group_id_for_task(task_id)), target_employee_id))
      OR (comment_type = 'suggestion' AND target_employee_id IS NOT NULL
          AND public.can_send_suggestion(COALESCE(task_group_id, public.task_group_id_for_task(task_id)), target_employee_id))
      OR (comment_type = 'report' AND target_employee_id IS NOT NULL
          AND public.can_send_report(COALESCE(task_group_id, public.task_group_id_for_task(task_id)), target_employee_id))
    )
  );

COMMENT ON POLICY "task_comments_insert" ON public.task_comments IS
  '投稿者は自分自身。対象（タスク/タスクグループ）への投稿権限に加え、comment_type=advice/suggestion/reportの場合はそれぞれの送信可否関数で宛先制限を追加適用する';

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
      comment_type = 'general'
      OR (comment_type = 'advice' AND target_employee_id IS NOT NULL
          AND public.can_send_advice(COALESCE(task_group_id, public.task_group_id_for_task(task_id)), target_employee_id))
      OR (comment_type = 'suggestion' AND target_employee_id IS NOT NULL
          AND public.can_send_suggestion(COALESCE(task_group_id, public.task_group_id_for_task(task_id)), target_employee_id))
      OR (comment_type = 'report' AND target_employee_id IS NOT NULL
          AND public.can_send_report(COALESCE(task_group_id, public.task_group_id_for_task(task_id)), target_employee_id))
    )
  );

COMMENT ON POLICY "task_comments_update" ON public.task_comments IS
  '投稿者本人のみ更新可（本文編集）。task_comments_insertと完全に同一の権限チェック（USING/WITH CHECKの違いのみ）を適用し、UPDATE経由でのadvice/suggestion/report宛先チェックのバイパスを防ぐ（20260910100500と同種の事故を再発させないため）';

-- コメント返信: parent_comment_id があるとき、宛先が親コメントの投稿者なら許可する。
-- 背景: 「あなた宛ての投稿」からの返信で、送信者（責任者など）が
-- can_send_general の通常宛先（目標責任者・タスクメンバー）に含まれない場合がある。
--
-- 呼び出し: src/features/task-management/actions.ts createComment（task_comments INSERT）
-- 依存: 20260912152758_allow_general_comment_target.sql
-- ローカル適用: supabase migration up（db reset は使わない）

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
          OR (
            parent_comment_id IS NOT NULL
            AND EXISTS (
              SELECT 1
              FROM public.task_comments p
              WHERE p.id = parent_comment_id
                AND p.employee_id = target_employee_id
                AND (
                  (task_id IS NOT NULL AND p.task_id = task_id)
                  OR (task_group_id IS NOT NULL AND p.task_group_id = task_group_id)
                )
            )
          )
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
  '投稿者は自分自身。general は can_send_general、または親コメント投稿者への返信を許可';

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
          OR (
            parent_comment_id IS NOT NULL
            AND EXISTS (
              SELECT 1
              FROM public.task_comments p
              WHERE p.id = parent_comment_id
                AND p.employee_id = target_employee_id
                AND (
                  (task_id IS NOT NULL AND p.task_id = task_id)
                  OR (task_group_id IS NOT NULL AND p.task_group_id = task_group_id)
                )
            )
          )
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
  '投稿者本人のみ更新可。task_comments_insert と同一の権限チェック';

-- task_comments_update に WITH CHECK を追加し、UPDATE経由でcomment_type/target_employee_idを
-- 書き換えてadvice送信権限(can_send_advice)を回避できる抜け道を塞ぐ。
-- task_comments_insertの advice 分岐と同じ制約をUPDATEにも適用する。
-- 背景: Phase 4最終ブランチレビュー Important指摘 I2
-- 依存: 20260907135655_create_task_comments_table.sql の can_comment_on_task_group() / can_comment_on_task()
-- 依存: 20260910100100_add_task_comments_advice_target.sql の can_send_advice() / task_group_id_for_task()

DROP POLICY IF EXISTS "task_comments_update" ON public.task_comments;
CREATE POLICY "task_comments_update" ON public.task_comments
  FOR UPDATE
  USING (
    tenant_id = public.current_tenant_id()
    AND employee_id = public.current_employee_id()
  )
  WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND employee_id = public.current_employee_id()
    AND (
      comment_type <> 'advice'
      OR (
        target_employee_id IS NOT NULL
        AND public.can_send_advice(
          COALESCE(
            task_group_id,
            public.task_group_id_for_task(task_id)
          ),
          target_employee_id
        )
      )
    )
  );

COMMENT ON POLICY "task_comments_update" ON public.task_comments IS
  '投稿者本人のみ更新可（本文編集）。UPDATE後の行がcomment_type=adviceになる場合はcan_send_adviceで宛先権限を再検証し、INSERT経由のadvice送信権限をUPDATE経由で回避できないようにする（Phase4レビュー指摘I2）';

-- task_comments_update に WITH CHECK を追加し、UPDATE経由でcomment_type/target_employee_idを
-- 書き換えてadvice送信権限(can_send_advice)を回避できる抜け道を塞ぐ。
-- task_comments_insertの advice 分岐と同じ制約をUPDATEにも適用する。
-- 背景: Phase 4最終ブランチレビュー Important指摘 I2
-- 依存: 20260907135655_create_task_comments_table.sql の can_comment_on_task_group() / can_comment_on_task()
-- 依存: 20260910100100_add_task_comments_advice_target.sql の can_send_advice() / task_group_id_for_task()
--
-- 再指摘（Phase4最終レビュー再指摘）: 初版のWITH CHECKはadvice分岐のみを追加し、
-- 20260908001606_fix_task_comments_update_authorization_bypass.sql が既に追加していた
-- 「投稿対象（タスク/タスクグループ）への基本コメント権限」チェックを誤って欠落させていた。
-- そのため、コメント権限の無いタスクグループへ自分のコメントを task_id=NULL,
-- task_group_id=<権限外グループ> でUPDATEし再配置する、という別の抜け道が再発していた。
-- 本版では task_comments_insert と全く同じ基本権限チェックを復元した上でadvice分岐を追加する。

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
            public.task_group_id_for_task(task_id)
          ),
          target_employee_id
        )
      )
    )
  );

COMMENT ON POLICY "task_comments_update" ON public.task_comments IS
  '投稿者本人のみ更新可（本文編集）。task_comments_insertと同じ基本権限チェック（グループ/タスクへの投稿権限）に加え、UPDATE後の行がcomment_type=adviceになる場合はcan_send_adviceで宛先権限を再検証する。20260908001606で追加された基本権限チェックを本ポリシー書き換え時に欠落させていたため復元（Phase4最終レビュー指摘）';

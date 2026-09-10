'use server'

import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { revalidatePath } from 'next/cache'
import { APP_ROUTES } from '@/config/routes'
import {
  createObjectiveSchema,
  type CreateObjectiveInput,
  createMilestoneSchema,
  type CreateMilestoneInput,
  createTaskGroupSchema,
  type CreateTaskGroupInput,
  updateTaskGroupSchema,
  type UpdateTaskGroupInput,
  assignManagerSchema,
  type AssignManagerInput,
  assignMemberSchema,
  type AssignMemberInput,
  removeMemberSchema,
  type RemoveMemberInput,
  createTaskSchema,
  type CreateTaskInput,
  updateTaskStatusSchema,
  type UpdateTaskStatusInput,
  updateTaskProgressSchema,
  type UpdateTaskProgressInput,
  addTaskAssigneeSchema,
  type AddTaskAssigneeInput,
  removeTaskAssigneeSchema,
  type RemoveTaskAssigneeInput,
  createCommentSchema,
  type CreateCommentInput,
  updateCommentSchema,
  type UpdateCommentInput,
  deleteCommentSchema,
  type DeleteCommentInput,
  getTaskCommentsTargetSchema,
  type TaskComment,
  createWorkLogSchema,
  type CreateWorkLogInput,
  updateWorkLogSchema,
  type UpdateWorkLogInput,
  deleteWorkLogSchema,
  type DeleteWorkLogInput,
  getTaskWorkLogsTargetSchema,
  type TaskWorkLog,
} from './types'
import { getTaskComments, getTaskWorkLogs } from './queries'

/**
 * 目標（task_objectives）を新規作成する。
 *
 * 注意: AppUser.tenant_id / employee_id は共に optional
 * （`src/types/auth.ts` 参照。従業員レコードが無いユーザーは undefined になりうる）。
 * task_objectives.tenant_id / owner_employee_id は NOT NULL のため、
 * ここで欠落を検出して早期に弾く（RLS の INSERT ポリシーが
 * owner_employee_id = current_employee_id() を要求するため、
 * employee_id が無いユーザーはそもそも作成できない）。
 */
export async function createObjective(input: CreateObjectiveInput): Promise<{ id: string }> {
  const user = await getServerUser()
  if (!user) throw new Error('Unauthorized')
  if (!user.tenant_id || !user.employee_id) {
    throw new Error('テナントまたは従業員情報が取得できませんでした')
  }

  const parsed = createObjectiveSchema.parse(input)
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('task_objectives')
    .insert({
      tenant_id: user.tenant_id,
      owner_employee_id: user.employee_id,
      title: parsed.title,
      description: parsed.description ?? null,
      due_date: parsed.dueDate ?? null,
    })
    .select('id')
    .single()

  if (error) throw error

  revalidatePath(APP_ROUTES.tasks.root)

  return { id: data.id }
}

/**
 * マイルストーン（task_milestones）を新規作成する。
 *
 * 注意: AppUser.tenant_id は optional（`src/types/auth.ts` 参照。
 * 従業員レコードが無いユーザーは undefined になりうる）。
 * task_milestones.tenant_id は NOT NULL のため、ここで欠落を検出して早期に弾く。
 */
export async function createMilestone(input: CreateMilestoneInput): Promise<{ id: string }> {
  const user = await getServerUser()
  if (!user) throw new Error('Unauthorized')
  if (!user.tenant_id) {
    throw new Error('テナント情報が取得できませんでした')
  }

  const parsed = createMilestoneSchema.parse(input)
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('task_milestones')
    .insert({
      tenant_id: user.tenant_id,
      objective_id: parsed.objectiveId,
      title: parsed.title,
      description: parsed.description ?? null,
      due_date: parsed.dueDate ?? null,
    })
    .select('id')
    .single()

  if (error) throw error

  revalidatePath(APP_ROUTES.tasks.objectiveDetail(parsed.objectiveId))

  return { id: data.id }
}

/**
 * タスクグループ（task_groups）を新規作成する。
 *
 * 注意: AppUser.tenant_id は optional（`src/types/auth.ts` 参照。
 * 従業員レコードが無いユーザーは undefined になりうる）。
 * task_groups.tenant_id は NOT NULL のため、ここで欠落を検出して早期に弾く。
 *
 * revalidatePath には目標詳細ページのパスが必要だが、入力には milestoneId しか
 * 含まれないため、先にマイルストーンから objective_id を引いてから挿入する。
 */
export async function createTaskGroup(input: CreateTaskGroupInput): Promise<{ id: string }> {
  const user = await getServerUser()
  if (!user) throw new Error('Unauthorized')
  if (!user.tenant_id) {
    throw new Error('テナント情報が取得できませんでした')
  }

  const parsed = createTaskGroupSchema.parse(input)
  const supabase = await createClient()

  const { data: milestone, error: milestoneError } = await supabase
    .from('task_milestones')
    .select('objective_id')
    .eq('id', parsed.milestoneId)
    .single()

  if (milestoneError) throw milestoneError

  const { data, error } = await supabase
    .from('task_groups')
    .insert({
      tenant_id: user.tenant_id,
      milestone_id: parsed.milestoneId,
      name: parsed.name,
      description: parsed.description ?? null,
      goal_summary: parsed.goalSummary ?? null,
    })
    .select('id')
    .single()

  if (error) throw error

  revalidatePath(APP_ROUTES.tasks.objectiveDetail(milestone.objective_id))

  return { id: data.id }
}

/**
 * タスクグループ（task_groups）の名前・説明・目標（達成基準）を更新する。
 * 更新可否（責任者・マネージャー）は RLS の task_groups UPDATE ポリシーが強制する
 * （Phase4要求18でマネージャーにも拡張済み）。0件更新時はエラーを投げる（updateTaskStatus等と同じパターン）。
 */
export async function updateTaskGroup(input: UpdateTaskGroupInput): Promise<void> {
  const user = await getServerUser()
  if (!user) throw new Error('Unauthorized')

  const parsed = updateTaskGroupSchema.parse(input)
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('task_groups')
    .update({
      name: parsed.name,
      description: parsed.description ?? null,
      goal_summary: parsed.goalSummary ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', parsed.taskGroupId)
    .select('id')

  if (error) throw error
  if (data === null || data.length === 0) {
    throw new Error('このタスクグループを編集する権限がありません')
  }

  revalidatePath(APP_ROUTES.tasks.groupDetail(parsed.taskGroupId))
}

/**
 * タスクグループ（task_groups）にマネージャーを割り当てる。
 *
 * 注意: AppUser.tenant_id は optional（`src/types/auth.ts` 参照。
 * 従業員レコードが無いユーザーは undefined になりうる）。
 * task_group_managers.tenant_id は NOT NULL のため、ここで欠落を検出して早期に弾く。
 * 実際の割当可否（責任者のみ）は RLS の INSERT ポリシーが強制する
 * （`is_task_group_owner`）。`canAssignManager`（Task5）は UI 表示制御用。
 */
export async function assignManager(input: AssignManagerInput): Promise<void> {
  const user = await getServerUser()
  if (!user) throw new Error('Unauthorized')
  if (!user.tenant_id) {
    throw new Error('テナント情報が取得できませんでした')
  }

  const parsed = assignManagerSchema.parse(input)
  const supabase = await createClient()

  const { error } = await supabase.from('task_group_managers').insert({
    tenant_id: user.tenant_id,
    task_group_id: parsed.taskGroupId,
    employee_id: parsed.employeeId,
  })

  if (error) throw error

  revalidatePath(APP_ROUTES.tasks.groupDetail(parsed.taskGroupId))
}

/**
 * タスクグループ（task_groups）にメンバーを追加する。
 *
 * 注意: AppUser.tenant_id は optional（`src/types/auth.ts` 参照。
 * 従業員レコードが無いユーザーは undefined になりうる）。
 * task_group_members.tenant_id は NOT NULL のため、ここで欠落を検出して早期に弾く。
 * 実際の割当可否（責任者またはマネージャー）は RLS の INSERT ポリシーが強制する
 * （`is_task_group_owner` / `is_task_group_manager`）。`canAssignMember`（Task5）は UI 表示制御用。
 */
export async function assignMember(input: AssignMemberInput): Promise<void> {
  const user = await getServerUser()
  if (!user) throw new Error('Unauthorized')
  if (!user.tenant_id) {
    throw new Error('テナント情報が取得できませんでした')
  }

  const parsed = assignMemberSchema.parse(input)
  const supabase = await createClient()

  const { error } = await supabase.from('task_group_members').insert({
    tenant_id: user.tenant_id,
    task_group_id: parsed.taskGroupId,
    employee_id: parsed.employeeId,
  })

  if (error) throw error

  revalidatePath(APP_ROUTES.tasks.groupDetail(parsed.taskGroupId))
}

/**
 * タスクグループ（task_groups）からメンバーを解除する。
 *
 * この操作は tenant_id を書き込みに使用しないため（DELETE の絞り込みは
 * task_group_id / employee_id のみ、テナント分離は RLS の USING 句が担保する）、
 * user.tenant_id の欠落チェックは不要。
 * 実際の解除可否（責任者またはマネージャー）は RLS の DELETE ポリシーが強制する。
 */
export async function removeMember(input: RemoveMemberInput): Promise<void> {
  const user = await getServerUser()
  if (!user) throw new Error('Unauthorized')

  const parsed = removeMemberSchema.parse(input)
  const supabase = await createClient()

  const { error } = await supabase
    .from('task_group_members')
    .delete()
    .eq('task_group_id', parsed.taskGroupId)
    .eq('employee_id', parsed.employeeId)

  if (error) throw error

  revalidatePath(APP_ROUTES.tasks.groupDetail(parsed.taskGroupId))
}

/**
 * タスク（tasks）を新規作成する。
 *
 * 注意: AppUser.tenant_id / employee_id は共に optional
 * （`src/types/auth.ts` 参照。従業員レコードが無いユーザーは undefined になりうる）。
 * tasks.tenant_id / created_by_employee_id は NOT NULL のため、
 * ここで欠落を検出して早期に弾く。
 */
export async function createTask(input: CreateTaskInput): Promise<{ id: string }> {
  const user = await getServerUser()
  if (!user) throw new Error('Unauthorized')
  if (!user.tenant_id || !user.employee_id) {
    throw new Error('テナントまたは従業員情報が取得できませんでした')
  }

  const parsed = createTaskSchema.parse(input)
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      tenant_id: user.tenant_id,
      task_group_id: parsed.taskGroupId,
      title: parsed.title,
      description: parsed.description ?? null,
      goal_summary: parsed.goalSummary ?? null,
      priority: parsed.priority,
      due_date: parsed.dueDate ?? null,
      created_by_employee_id: user.employee_id,
    })
    .select('id')
    .single()

  if (error) throw error

  if (parsed.assigneeEmployeeIds.length > 0) {
    const { error: assigneeError } = await supabase.from('task_assignees').insert(
      parsed.assigneeEmployeeIds.map(employeeId => ({
        tenant_id: user.tenant_id!,
        task_id: data.id,
        employee_id: employeeId,
      }))
    )
    if (assigneeError) throw assigneeError
  }

  revalidatePath(APP_ROUTES.tasks.groupDetail(parsed.taskGroupId))

  return { id: data.id }
}

/**
 * タスク（tasks）のステータスのみを更新する。
 *
 * カラム制限: `.update()` には `status` と `updated_at` のみを渡す。
 * `title` 等の他カラムは絶対に含めない
 * （RLS の `tasks_update` ポリシーは担当者本人の更新を許可するが、行レベルの制御しかできず
 * カラム単位の制限はできないため、「どのカラムを書き込むか」はこのアクションのコードが担保する）。
 *
 * 権限が無い場合のサイレント失敗対策: RLS ポリシーに合致しない `UPDATE` は
 * エラーを返さず0件更新で成功扱いになる。`.select('id')` で更新行を取得し、
 * 0件なら明示的にエラーを投げる（最終レビュー Finding 1-3 で修正）。
 */
export async function updateTaskStatus(input: UpdateTaskStatusInput): Promise<void> {
  const user = await getServerUser()
  if (!user) throw new Error('Unauthorized')

  const parsed = updateTaskStatusSchema.parse(input)
  const supabase = await createClient()

  const { data: task, error: fetchError } = await supabase
    .from('tasks')
    .select('task_group_id')
    .eq('id', parsed.taskId)
    .single()

  if (fetchError) throw fetchError

  const { data, error } = await supabase
    .from('tasks')
    .update({ status: parsed.status, updated_at: new Date().toISOString() })
    .eq('id', parsed.taskId)
    .select('id')

  if (error) throw error
  if (data === null || data.length === 0) {
    throw new Error('このタスクを更新する権限がありません')
  }

  revalidatePath(APP_ROUTES.tasks.groupDetail(task.task_group_id))
}

/**
 * タスク（tasks）の進捗率のみを更新する。
 *
 * カラム制限: `.update()` には `progress_percent` と `updated_at` のみを渡す。
 * `status` 等の他カラムは絶対に含めない（理由は `updateTaskStatus` と同様）。
 * 0件更新時のエラー化についても `updateTaskStatus` と同様（最終レビュー Finding 1-3）。
 */
export async function updateTaskProgress(input: UpdateTaskProgressInput): Promise<void> {
  const user = await getServerUser()
  if (!user) throw new Error('Unauthorized')

  const parsed = updateTaskProgressSchema.parse(input)
  const supabase = await createClient()

  const { data: task, error: fetchError } = await supabase
    .from('tasks')
    .select('task_group_id')
    .eq('id', parsed.taskId)
    .single()

  if (fetchError) throw fetchError

  const { data, error } = await supabase
    .from('tasks')
    .update({ progress_percent: parsed.progressPercent, updated_at: new Date().toISOString() })
    .eq('id', parsed.taskId)
    .select('id')

  if (error) throw error
  if (data === null || data.length === 0) {
    throw new Error('このタスクを更新する権限がありません')
  }

  revalidatePath(APP_ROUTES.tasks.groupDetail(task.task_group_id))
}

/**
 * タスク（tasks）に担当者を1名追加する。
 * 追加可否（責任者・マネージャー）は RLS の task_assignees INSERT ポリシーが強制する。
 */
export async function addTaskAssignee(input: AddTaskAssigneeInput): Promise<void> {
  const user = await getServerUser()
  if (!user) throw new Error('Unauthorized')
  if (!user.tenant_id) {
    throw new Error('テナント情報が取得できませんでした')
  }

  const parsed = addTaskAssigneeSchema.parse(input)
  const supabase = await createClient()

  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .select('task_group_id')
    .eq('id', parsed.taskId)
    .single()

  if (taskError) throw taskError

  const { error } = await supabase.from('task_assignees').insert({
    tenant_id: user.tenant_id,
    task_id: parsed.taskId,
    employee_id: parsed.employeeId,
  })

  if (error) throw error

  revalidatePath(APP_ROUTES.tasks.groupDetail(task.task_group_id))
}

/**
 * タスク（tasks）から担当者を1名解除する。
 * 解除可否（責任者・マネージャー）は RLS の task_assignees DELETE ポリシーが強制する。
 * 0件削除時はエラーを投げる（`updateTaskStatus` と同じパターン）。
 */
export async function removeTaskAssignee(input: RemoveTaskAssigneeInput): Promise<void> {
  const user = await getServerUser()
  if (!user) throw new Error('Unauthorized')

  const parsed = removeTaskAssigneeSchema.parse(input)
  const supabase = await createClient()

  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .select('task_group_id')
    .eq('id', parsed.taskId)
    .single()

  if (taskError) throw taskError

  const { data, error } = await supabase
    .from('task_assignees')
    .delete()
    .eq('task_id', parsed.taskId)
    .eq('employee_id', parsed.employeeId)
    .select('id')

  if (error) throw error
  if (data === null || data.length === 0) {
    throw new Error('この担当者を解除する権限がありません')
  }

  revalidatePath(APP_ROUTES.tasks.groupDetail(task.task_group_id))
}

/**
 * コメント（task_comments）を新規作成する。
 *
 * 注意: AppUser.tenant_id / employee_id は共に optional のため早期に弾く。
 * 投稿可否（対象に応じた権限）は RLS の INSERT ポリシーが強制する
 * （`can_comment_on_task` / `can_comment_on_task_group`）。
 * revalidatePath はタスクグループ詳細ページ（コメントがどちらの対象でも
 * 表示場所は最終的にこのページ配下になる）を対象にする。
 */
export async function createComment(input: CreateCommentInput): Promise<{ id: string }> {
  const user = await getServerUser()
  if (!user) throw new Error('Unauthorized')
  if (!user.tenant_id || !user.employee_id) {
    throw new Error('テナントまたは従業員情報が取得できませんでした')
  }

  const parsed = createCommentSchema.parse(input)
  const supabase = await createClient()

  // revalidatePath 用に対象タスクグループのIDを解決する
  let taskGroupIdForRevalidate: string
  if (parsed.taskGroupId) {
    taskGroupIdForRevalidate = parsed.taskGroupId
  } else {
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('task_group_id')
      .eq('id', parsed.taskId)
      .single()
    if (taskError) throw taskError
    taskGroupIdForRevalidate = task.task_group_id
  }

  const { data, error } = await supabase
    .from('task_comments')
    .insert({
      tenant_id: user.tenant_id,
      task_id: parsed.taskId ?? null,
      task_group_id: parsed.taskGroupId ?? null,
      employee_id: user.employee_id,
      parent_comment_id: parsed.parentCommentId ?? null,
      comment_type: parsed.commentType,
      target_employee_id: parsed.targetEmployeeId ?? null,
      body: parsed.body,
    })
    .select('id')
    .single()

  if (error) throw error

  revalidatePath(APP_ROUTES.tasks.groupDetail(taskGroupIdForRevalidate))

  return { id: data.id }
}

/**
 * コメント（task_comments）の本文のみを更新する。
 *
 * カラム制限: `.update()` には `body` と `updated_at` のみを渡す
 * （`updateTaskStatus`/`updateTaskProgress` と同じ理由）。
 * 更新可否（投稿者本人のみ）は RLS の UPDATE ポリシーが強制する。
 * 0件更新時はエラーを投げる（`updateTaskStatus` と同じパターン）。
 */
export async function updateComment(input: UpdateCommentInput): Promise<void> {
  const user = await getServerUser()
  if (!user) throw new Error('Unauthorized')

  const parsed = updateCommentSchema.parse(input)
  const supabase = await createClient()

  const { data: comment, error: fetchError } = await supabase
    .from('task_comments')
    .select('task_id, task_group_id')
    .eq('id', parsed.commentId)
    .single()

  if (fetchError) throw fetchError

  const { data, error } = await supabase
    .from('task_comments')
    .update({ body: parsed.body, updated_at: new Date().toISOString() })
    .eq('id', parsed.commentId)
    .select('id')

  if (error) throw error
  if (data === null || data.length === 0) {
    throw new Error('このコメントを編集する権限がありません')
  }

  const taskGroupIdForRevalidate =
    comment.task_group_id ??
    (await supabase.from('tasks').select('task_group_id').eq('id', comment.task_id!).single()).data
      ?.task_group_id

  if (taskGroupIdForRevalidate) {
    revalidatePath(APP_ROUTES.tasks.groupDetail(taskGroupIdForRevalidate))
  }
}

/**
 * コメント（task_comments）を削除する。
 * 削除可否（投稿者本人、または責任者・マネージャー）は RLS の DELETE ポリシーが強制する。
 * 0件削除時はエラーを投げる。
 */
export async function deleteComment(input: DeleteCommentInput): Promise<void> {
  const user = await getServerUser()
  if (!user) throw new Error('Unauthorized')

  const parsed = deleteCommentSchema.parse(input)
  const supabase = await createClient()

  const { data: comment, error: fetchError } = await supabase
    .from('task_comments')
    .select('task_id, task_group_id')
    .eq('id', parsed.commentId)
    .single()

  if (fetchError) throw fetchError

  const { data, error } = await supabase
    .from('task_comments')
    .delete()
    .eq('id', parsed.commentId)
    .select('id')

  if (error) throw error
  if (data === null || data.length === 0) {
    throw new Error('このコメントを削除する権限がありません')
  }

  const taskGroupIdForRevalidate =
    comment.task_group_id ??
    (await supabase.from('tasks').select('task_group_id').eq('id', comment.task_id!).single()).data
      ?.task_group_id

  if (taskGroupIdForRevalidate) {
    revalidatePath(APP_ROUTES.tasks.groupDetail(taskGroupIdForRevalidate))
  }
}

/**
 * コメント一覧を取得する読み取り専用 Server Action。
 *
 * 通常このプロジェクトでは SELECT は queries.ts に置くが、タスク詳細モーダルや
 * タスクグループのコメント欄は Client Component からモーダルを開いたタイミング等で
 * 動的に取得する必要があり、Client Component が呼べるのは Server Action のみのため、
 * ここに薄いラッパーとして置く（`docs/implementation-plan-task-management.md` セクション13.4）。
 */
export async function getTaskCommentsAction(
  target: { taskId: string } | { taskGroupId: string }
): Promise<TaskComment[]> {
  const user = await getServerUser()
  if (!user) throw new Error('Unauthorized')

  const parsed = getTaskCommentsTargetSchema.parse(target)
  const supabase = await createClient()
  return getTaskComments(supabase, parsed)
}

/**
 * 工数記録（task_work_logs）を新規作成する。
 *
 * 注意: AppUser.tenant_id / employee_id は共に optional のため早期に弾く。
 * 記録可否（対象タスクへの記録権限）は RLS の INSERT ポリシーが強制する
 * （`can_log_work_on_task`）。revalidatePath 用に対象タスクの task_group_id を先に引く。
 */
export async function createWorkLog(input: CreateWorkLogInput): Promise<{ id: string }> {
  const user = await getServerUser()
  if (!user) throw new Error('Unauthorized')
  if (!user.tenant_id || !user.employee_id) {
    throw new Error('テナントまたは従業員情報が取得できませんでした')
  }

  const parsed = createWorkLogSchema.parse(input)
  const supabase = await createClient()

  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .select('task_group_id')
    .eq('id', parsed.taskId)
    .single()

  if (taskError) throw taskError

  const { data, error } = await supabase
    .from('task_work_logs')
    .insert({
      tenant_id: user.tenant_id,
      task_id: parsed.taskId,
      employee_id: user.employee_id,
      work_date: parsed.workDate,
      hours: parsed.hours,
      note: parsed.note ?? null,
    })
    .select('id')
    .single()

  if (error) throw error

  revalidatePath(APP_ROUTES.tasks.groupDetail(task.task_group_id))

  return { id: data.id }
}

/**
 * 工数記録（task_work_logs）を更新する（作業日・時間・メモのみ）。
 *
 * カラム制限: `.update()` には `work_date`/`hours`/`note`/`updated_at` のみを渡す
 * （`task_id`/`employee_id` は変更させない）。
 * 更新可否（投稿者本人のみ）は RLS の UPDATE ポリシーが強制する。
 * 0件更新時はエラーを投げる（`updateTaskStatus` と同じパターン）。
 */
export async function updateWorkLog(input: UpdateWorkLogInput): Promise<void> {
  const user = await getServerUser()
  if (!user) throw new Error('Unauthorized')

  const parsed = updateWorkLogSchema.parse(input)
  const supabase = await createClient()

  const { data: log, error: fetchError } = await supabase
    .from('task_work_logs')
    .select('task_id')
    .eq('id', parsed.workLogId)
    .single()

  if (fetchError) throw fetchError

  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .select('task_group_id')
    .eq('id', log.task_id)
    .single()

  if (taskError) throw taskError

  const { data, error } = await supabase
    .from('task_work_logs')
    .update({
      work_date: parsed.workDate,
      hours: parsed.hours,
      note: parsed.note ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', parsed.workLogId)
    .select('id')

  if (error) throw error
  if (data === null || data.length === 0) {
    throw new Error('この工数記録を編集する権限がありません')
  }

  revalidatePath(APP_ROUTES.tasks.groupDetail(task.task_group_id))
}

/**
 * 工数記録（task_work_logs）を削除する。
 * 削除可否（投稿者本人のみ）は RLS の DELETE ポリシーが強制する。
 * 0件削除時はエラーを投げる。
 */
export async function deleteWorkLog(input: DeleteWorkLogInput): Promise<void> {
  const user = await getServerUser()
  if (!user) throw new Error('Unauthorized')

  const parsed = deleteWorkLogSchema.parse(input)
  const supabase = await createClient()

  const { data: log, error: fetchError } = await supabase
    .from('task_work_logs')
    .select('task_id')
    .eq('id', parsed.workLogId)
    .single()

  if (fetchError) throw fetchError

  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .select('task_group_id')
    .eq('id', log.task_id)
    .single()

  if (taskError) throw taskError

  const { data, error } = await supabase
    .from('task_work_logs')
    .delete()
    .eq('id', parsed.workLogId)
    .select('id')

  if (error) throw error
  if (data === null || data.length === 0) {
    throw new Error('この工数記録を削除する権限がありません')
  }

  revalidatePath(APP_ROUTES.tasks.groupDetail(task.task_group_id))
}

/**
 * タスク1件の工数記録一覧を取得する読み取り専用 Server Action。
 * タスク詳細モーダルが開いたタイミングで動的に取得する必要があり、
 * Client Component が呼べるのは Server Action のみのため、薄いラッパーとして置く
 * （`docs/implementation-plan-task-management.md` セクション14.4。コメントの
 * `getTaskCommentsAction` と同じ意図的逸脱）。
 */
export async function getTaskWorkLogsAction(target: { taskId: string }): Promise<TaskWorkLog[]> {
  const user = await getServerUser()
  if (!user) throw new Error('Unauthorized')

  const parsed = getTaskWorkLogsTargetSchema.parse(target)
  const supabase = await createClient()
  return getTaskWorkLogs(supabase, parsed.taskId)
}

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
  createCommentSchema,
  type CreateCommentInput,
  updateCommentSchema,
  type UpdateCommentInput,
  deleteCommentSchema,
  type DeleteCommentInput,
  getTaskCommentsTargetSchema,
  type TaskComment,
} from './types'
import { getTaskComments } from './queries'

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
    })
    .select('id')
    .single()

  if (error) throw error

  revalidatePath(APP_ROUTES.tasks.objectiveDetail(milestone.objective_id))

  return { id: data.id }
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
      assignee_employee_id: parsed.assigneeEmployeeId ?? null,
      priority: parsed.priority,
      due_date: parsed.dueDate ?? null,
      created_by_employee_id: user.employee_id,
    })
    .select('id')
    .single()

  if (error) throw error

  revalidatePath(APP_ROUTES.tasks.groupDetail(parsed.taskGroupId))

  return { id: data.id }
}

/**
 * タスク（tasks）のステータスのみを更新する。
 *
 * カラム制限: `.update()` には `status` と `updated_at` のみを渡す。
 * `title` / `assignee_employee_id` 等の他カラムは絶対に含めない
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

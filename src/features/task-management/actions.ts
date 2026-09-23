'use server'

import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { revalidatePath } from 'next/cache'
import { APP_ROUTES } from '@/config/routes'
import {
  createObjectiveSchema,
  type CreateObjectiveInput,
  updateObjectiveSchema,
  type UpdateObjectiveInput,
  createMilestoneSchema,
  type CreateMilestoneInput,
  createTaskGroupSchema,
  type CreateTaskGroupInput,
  createSimpleTaskSchema,
  type CreateSimpleTaskInput,
  updateTaskStatusSchema,
  type UpdateTaskStatusInput,
  updateTaskProgressSchema,
  type UpdateTaskProgressInput,
  updateTaskBasicInfoSchema,
  type UpdateTaskBasicInfoInput,
  addTaskAssigneeSchema,
  type AddTaskAssigneeInput,
  removeTaskAssigneeSchema,
  type RemoveTaskAssigneeInput,
  deleteTaskSchema,
  type DeleteTaskInput,
  deleteObjectiveSchema,
  type DeleteObjectiveInput,
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
export async function createObjective(
  input: CreateObjectiveInput
): Promise<{ id: string; defaultTaskGroupId: string }> {
  const user = await getServerUser()
  if (!user) throw new Error('Unauthorized')
  if (!user.tenant_id || !user.employee_id) {
    throw new Error('テナントまたは従業員情報が取得できませんでした')
  }

  const parsed = createObjectiveSchema.parse(input)
  const supabase = await createClient()

  const { data: objective, error: objectiveError } = await supabase
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

  if (objectiveError) throw objectiveError

  // Phase5: UIには表示しない既定のマイルストーン・タスクグループを自動生成する
  const { data: milestone, error: milestoneError } = await supabase
    .from('task_milestones')
    .insert({
      tenant_id: user.tenant_id,
      objective_id: objective.id,
      title: '既定マイルストーン',
    })
    .select('id')
    .single()

  if (milestoneError) {
    // 最終レビュー Finding 3: マイルストーン作成が失敗すると、目標行だけが残った
    // 「開けない目標」（getObjectiveSimpleViewが必ずエラーになる）が生じてしまうため、
    // 直前に作成した目標行を補償削除してから再スローする。id指定の絞り込みのみ行う。
    await supabase.from('task_objectives').delete().eq('id', objective.id)
    throw milestoneError
  }

  const { data: group, error: groupError } = await supabase
    .from('task_groups')
    .insert({
      tenant_id: user.tenant_id,
      milestone_id: milestone.id,
      name: '既定タスクグループ',
    })
    .select('id')
    .single()

  if (groupError) {
    // 同上。マイルストーンまで作成済みの状態で失敗した場合は、マイルストーン・目標の両方を
    // id指定で補償削除する（作成順と逆順）。
    await supabase.from('task_milestones').delete().eq('id', milestone.id)
    await supabase.from('task_objectives').delete().eq('id', objective.id)
    throw groupError
  }

  revalidatePath(APP_ROUTES.tasks.root)

  return { id: objective.id, defaultTaskGroupId: group.id }
}

/**
 * 目標（task_objectives）の目標名・説明・期限を更新する。
 * 更新可否（目標作成者、または employee 以外の役割）は RLS の task_objectives_update が強制する。
 * 0件更新時はエラーを投げる。
 */
export async function updateObjective(input: UpdateObjectiveInput): Promise<void> {
  const user = await getServerUser()
  if (!user) throw new Error('Unauthorized')

  const parsed = updateObjectiveSchema.parse(input)
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('task_objectives')
    .update({
      title: parsed.title,
      description: parsed.description ?? null,
      due_date: parsed.dueDate ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', parsed.objectiveId)
    .select('id')

  if (error) throw error
  if (data === null || data.length === 0) {
    throw new Error('この目標を更新する権限がありません')
  }

  revalidatePath(APP_ROUTES.tasks.root)
  revalidatePath(APP_ROUTES.tasks.objectiveDetail(parsed.objectiveId))
  revalidatePath(APP_ROUTES.tasks.objectiveEdit(parsed.objectiveId))
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
 * Phase5のシンプルUI専用: タスクを作成し、同時にタスク責任者を task_assignees（role='responsible'）
 * および task_group_managers に登録する。
 * task_group_managers への同期登録は、責任者・メンバーが既存RLS（task_objectives_select等の
 * 「タスクグループ参加者」条件）の可視範囲に入るようにするため（design.mdセクション2.3）。
 */
export async function createSimpleTask(input: CreateSimpleTaskInput): Promise<{ id: string }> {
  const user = await getServerUser()
  if (!user) throw new Error('Unauthorized')
  if (!user.tenant_id || !user.employee_id) {
    throw new Error('テナントまたは従業員情報が取得できませんでした')
  }

  const parsed = createSimpleTaskSchema.parse(input)
  const supabase = await createClient()

  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .insert({
      tenant_id: user.tenant_id,
      task_group_id: parsed.taskGroupId,
      title: parsed.title,
      goal_summary: parsed.goalSummary ?? null,
      due_date: parsed.dueDate ?? null,
      priority: parsed.priority,
      created_by_employee_id: user.employee_id,
    })
    .select('id')
    .single()

  if (taskError) throw taskError

  const { error: assigneeError } = await supabase.from('task_assignees').insert({
    tenant_id: user.tenant_id,
    task_id: task.id,
    employee_id: parsed.responsibleEmployeeId,
    role: 'responsible',
  })

  if (assigneeError) throw assigneeError

  const { error: managerError } = await supabase.from('task_group_managers').upsert(
    {
      tenant_id: user.tenant_id,
      task_group_id: parsed.taskGroupId,
      employee_id: parsed.responsibleEmployeeId,
    },
    { onConflict: 'task_group_id,employee_id', ignoreDuplicates: true }
  )

  if (managerError) throw managerError

  revalidatePath(APP_ROUTES.tasks.root)

  return { id: task.id }
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

  const { data, error } = await supabase
    .from('tasks')
    .update({ status: parsed.status, updated_at: new Date().toISOString() })
    .eq('id', parsed.taskId)
    .select('id')

  if (error) throw error
  if (data === null || data.length === 0) {
    throw new Error('このタスクを更新する権限がありません')
  }
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

  const { data, error } = await supabase
    .from('tasks')
    .update({ progress_percent: parsed.progressPercent, updated_at: new Date().toISOString() })
    .eq('id', parsed.taskId)
    .select('id')

  if (error) throw error
  if (data === null || data.length === 0) {
    throw new Error('このタスクを更新する権限がありません')
  }
}

/**
 * タスクの基本情報（タスク名・タスク目標・期限・優先順）を更新する。
 * カラム制限: title/goal_summary/due_date/priority/updated_at のみ更新する。
 * 更新可否（責任者・マネージャー）は RLS の tasks UPDATE ポリシーが強制する。
 */
export async function updateTaskBasicInfo(input: UpdateTaskBasicInfoInput): Promise<void> {
  const user = await getServerUser()
  if (!user) throw new Error('Unauthorized')

  const parsed = updateTaskBasicInfoSchema.parse(input)
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('tasks')
    .update({
      title: parsed.title,
      goal_summary: parsed.goalSummary ?? null,
      due_date: parsed.dueDate ?? null,
      ...(parsed.priority !== undefined ? { priority: parsed.priority } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('id', parsed.taskId)
    .select('id')

  if (error) throw error
  if (data === null || data.length === 0) {
    throw new Error('このタスクを更新する権限がありません')
  }

  revalidatePath(APP_ROUTES.tasks.root)
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
    role: parsed.role,
  })

  if (error) throw error

  if (parsed.role === 'member') {
    const { error: memberError } = await supabase.from('task_group_members').upsert(
      {
        tenant_id: user.tenant_id,
        task_group_id: task.task_group_id,
        employee_id: parsed.employeeId,
      },
      { onConflict: 'task_group_id,employee_id', ignoreDuplicates: true }
    )
    if (memberError) throw memberError
  } else {
    const { error: managerError } = await supabase.from('task_group_managers').upsert(
      {
        tenant_id: user.tenant_id,
        task_group_id: task.task_group_id,
        employee_id: parsed.employeeId,
      },
      { onConflict: 'task_group_id,employee_id', ignoreDuplicates: true }
    )
    if (managerError) throw managerError
  }
}

/**
 * タスク（tasks）から担当者を1名解除する。
 * 解除可否（責任者・マネージャー）は RLS の task_assignees DELETE ポリシーが強制する。
 * 0件削除時はエラーを投げる（`updateTaskStatus` と同じパターン）。
 *
 * 最終レビュー Finding 1: `addTaskAssignee`/`createSimpleTask` が行う
 * task_group_managers/task_group_members への同期登録と対になる後片付けとして、
 * 解除したロールで同一タスクグループ内の他タスクに割当が残っていなければ、
 * そのグループの task_group_managers/task_group_members からも解除する
 * （「削除して終わり」のスタイルとし、行数チェックは行わない）。
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
    .select('id, role')

  if (error) throw error
  if (data === null || data.length === 0) {
    throw new Error('この担当者を解除する権限がありません')
  }

  const deletedRole = data[0].role as 'responsible' | 'member'

  // task_assignees は (task_id, employee_id) がUNIQUEのため、同一タスクグループ内の
  // 他タスクへの割当有無は「同じロールで残っている行があるか」で判定できる。
  // task_assignees には task_group_id が無いため、tasks への埋め込みフィルタで絞り込む
  // （queries.ts の getWorkLogSummaryByGroup 等と同じ手法）。
  const { data: remainingAssignments, error: remainingError } = await supabase
    .from('task_assignees')
    .select('id, task:task_id!inner(task_group_id)')
    .eq('employee_id', parsed.employeeId)
    .eq('role', deletedRole)
    .eq('task.task_group_id', task.task_group_id)

  if (remainingError) throw remainingError

  if (!remainingAssignments || remainingAssignments.length === 0) {
    if (deletedRole === 'responsible') {
      const { error: managerCleanupError } = await supabase
        .from('task_group_managers')
        .delete()
        .eq('task_group_id', task.task_group_id)
        .eq('employee_id', parsed.employeeId)
      if (managerCleanupError) throw managerCleanupError
    } else {
      const { error: memberCleanupError } = await supabase
        .from('task_group_members')
        .delete()
        .eq('task_group_id', task.task_group_id)
        .eq('employee_id', parsed.employeeId)
      if (memberCleanupError) throw memberCleanupError
    }
  }
}

/**
 * タスク（tasks）を削除する。削除可否（責任者・マネージャー）は RLS の tasks DELETE ポリシーが強制する。
 * 0件削除時はエラーを投げる（`updateTaskStatus` と同じパターン）。
 */
export async function deleteTask(input: DeleteTaskInput): Promise<void> {
  const user = await getServerUser()
  if (!user) throw new Error('Unauthorized')

  const parsed = deleteTaskSchema.parse(input)
  const supabase = await createClient()

  const { data, error } = await supabase.from('tasks').delete().eq('id', parsed.taskId).select('id')

  if (error) throw error
  if (data === null || data.length === 0) {
    throw new Error('このタスクを削除する権限がありません')
  }

  revalidatePath(APP_ROUTES.tasks.root)
}

/**
 * 目標（task_objectives）を削除する。配下のマイルストーン・タスクグループ・タスクは
 * ON DELETE CASCADE で連鎖削除される。
 * 削除可否（目標作成者、または employee 以外の役割）は RLS の task_objectives_delete が強制する。
 * 0件削除時はエラーを投げる。
 */
export async function deleteObjective(input: DeleteObjectiveInput): Promise<void> {
  const user = await getServerUser()
  if (!user) throw new Error('Unauthorized')

  const parsed = deleteObjectiveSchema.parse(input)
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('task_objectives')
    .delete()
    .eq('id', parsed.objectiveId)
    .select('id')

  if (error) throw error
  if (data === null || data.length === 0) {
    throw new Error('この目標を削除する権限がありません')
  }

  revalidatePath(APP_ROUTES.tasks.root)
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

  const { data, error } = await supabase
    .from('task_comments')
    .update({ body: parsed.body, updated_at: new Date().toISOString() })
    .eq('id', parsed.commentId)
    .select('id')

  if (error) throw error
  if (data === null || data.length === 0) {
    throw new Error('このコメントを編集する権限がありません')
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

  const { data, error } = await supabase
    .from('task_comments')
    .delete()
    .eq('id', parsed.commentId)
    .select('id')

  if (error) throw error
  if (data === null || data.length === 0) {
    throw new Error('このコメントを削除する権限がありません')
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
 * （`can_log_work_on_task`）。
 */
export async function createWorkLog(input: CreateWorkLogInput): Promise<{ id: string }> {
  const user = await getServerUser()
  if (!user) throw new Error('Unauthorized')
  if (!user.tenant_id || !user.employee_id) {
    throw new Error('テナントまたは従業員情報が取得できませんでした')
  }

  const parsed = createWorkLogSchema.parse(input)
  const supabase = await createClient()

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

  const { data, error } = await supabase
    .from('task_work_logs')
    .delete()
    .eq('id', parsed.workLogId)
    .select('id')

  if (error) throw error
  if (data === null || data.length === 0) {
    throw new Error('この工数記録を削除する権限がありません')
  }
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

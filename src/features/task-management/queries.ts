import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import type { TaskObjective, TaskMilestone, TaskGroup, Task } from './types'
import { calculateAverageProgress } from './progress'

/** DB行（snake_case）を TaskObjective（camelCase）に変換する */
function mapObjective(row: Database['public']['Tables']['task_objectives']['Row']): TaskObjective {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    ownerEmployeeId: row.owner_employee_id,
    title: row.title,
    description: row.description,
    status: row.status as TaskObjective['status'],
    dueDate: row.due_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/**
 * 自分が閲覧可能な目標（task_objectives）一覧を取得する。
 * RLS の SELECT ポリシーが可視範囲（自分のテナント・自分の担当分等）を絞り込むため、
 * ここでは追加のテナント・権限フィルタは行わない。
 */
export async function getMyObjectives(
  supabase: SupabaseClient<Database>
): Promise<TaskObjective[]> {
  const { data, error } = await supabase
    .from('task_objectives')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error

  return (data ?? []).map(mapObjective)
}

/** DB行（snake_case）を TaskMilestone（camelCase）に変換する */
function mapMilestone(row: Database['public']['Tables']['task_milestones']['Row']): TaskMilestone {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    objectiveId: row.objective_id,
    title: row.title,
    description: row.description,
    dueDate: row.due_date,
    status: row.status as TaskMilestone['status'],
    sortOrder: row.sort_order,
  }
}

/** DB行（snake_case）を TaskGroup（camelCase）に変換する */
function mapTaskGroup(row: Database['public']['Tables']['task_groups']['Row']): TaskGroup {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    milestoneId: row.milestone_id,
    name: row.name,
    description: row.description,
    status: row.status as TaskGroup['status'],
    sortOrder: row.sort_order,
  }
}

export interface ObjectiveDetail {
  objective: TaskObjective
  milestones: TaskMilestone[]
  taskGroupsByMilestoneId: Record<string, TaskGroup[]>
}

/**
 * 目標（task_objectives）1件とその配下のマイルストーン一覧・タスクグループ一覧を取得する。
 * RLS の SELECT ポリシーが可視範囲を絞り込むため、ここでは追加のテナント・権限フィルタは行わない。
 */
export async function getObjectiveDetail(
  supabase: SupabaseClient<Database>,
  objectiveId: string
): Promise<ObjectiveDetail> {
  const { data: objectiveRow, error: objectiveError } = await supabase
    .from('task_objectives')
    .select('*')
    .eq('id', objectiveId)
    .single()

  if (objectiveError) throw objectiveError

  const { data: milestoneRows, error: milestoneError } = await supabase
    .from('task_milestones')
    .select('*')
    .eq('objective_id', objectiveId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (milestoneError) throw milestoneError

  const milestones = (milestoneRows ?? []).map(mapMilestone)
  const milestoneIds = milestones.map(m => m.id)

  const taskGroupsByMilestoneId: Record<string, TaskGroup[]> = {}
  if (milestoneIds.length > 0) {
    const { data: groupRows, error: groupError } = await supabase
      .from('task_groups')
      .select('*')
      .in('milestone_id', milestoneIds)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })

    if (groupError) throw groupError

    for (const row of groupRows ?? []) {
      const group = mapTaskGroup(row)
      taskGroupsByMilestoneId[group.milestoneId] ??= []
      taskGroupsByMilestoneId[group.milestoneId].push(group)
    }
  }

  return {
    objective: mapObjective(objectiveRow),
    milestones,
    taskGroupsByMilestoneId,
  }
}

export interface TaskGroupSummary {
  group: TaskGroup
  managerEmployeeIds: string[]
  memberEmployeeIds: string[]
  /** タスクグループの祖先にあたる目標（task_objectives）の責任者の従業員ID */
  objectiveOwnerEmployeeId: string
}

/**
 * タスクグループ（task_groups）1件と、そのマネージャー・メンバーの従業員ID一覧、
 * および祖先目標の責任者IDを取得する。
 * RLS の SELECT ポリシーが可視範囲を絞り込むため、ここでは追加のテナント・権限フィルタは行わない。
 */
export async function getTaskGroupSummary(
  supabase: SupabaseClient<Database>,
  taskGroupId: string
): Promise<TaskGroupSummary> {
  const { data: groupRow, error: groupError } = await supabase
    .from('task_groups')
    .select('*')
    .eq('id', taskGroupId)
    .single()

  if (groupError) throw groupError

  const { data: managerRows, error: managerError } = await supabase
    .from('task_group_managers')
    .select('employee_id')
    .eq('task_group_id', taskGroupId)

  if (managerError) throw managerError

  const { data: memberRows, error: memberError } = await supabase
    .from('task_group_members')
    .select('employee_id')
    .eq('task_group_id', taskGroupId)

  if (memberError) throw memberError

  // タスクグループ → マイルストーン → 目標 の順に辿って責任者IDを解決する
  // （このファイルの他の関数と同様、単純な連続クエリで済ませる）。
  const { data: milestoneRow, error: milestoneError } = await supabase
    .from('task_milestones')
    .select('objective_id')
    .eq('id', groupRow.milestone_id)
    .single()

  if (milestoneError) throw milestoneError

  const { data: objectiveRow, error: objectiveError } = await supabase
    .from('task_objectives')
    .select('owner_employee_id')
    .eq('id', milestoneRow.objective_id)
    .single()

  if (objectiveError) throw objectiveError

  return {
    group: mapTaskGroup(groupRow),
    managerEmployeeIds: (managerRows ?? []).map(r => r.employee_id),
    memberEmployeeIds: (memberRows ?? []).map(r => r.employee_id),
    objectiveOwnerEmployeeId: objectiveRow.owner_employee_id,
  }
}

/** DB行（snake_case）を Task（camelCase）に変換する */
function mapTask(row: Database['public']['Tables']['tasks']['Row']): Task {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    taskGroupId: row.task_group_id,
    title: row.title,
    description: row.description,
    assigneeEmployeeId: row.assignee_employee_id,
    status: row.status as Task['status'],
    progressPercent: row.progress_percent,
    priority: row.priority as Task['priority'],
    dueDate: row.due_date,
    sortOrder: row.sort_order,
  }
}

export interface TaskGroupBoard extends TaskGroupSummary {
  tasks: Task[]
  averageProgress: number
}

/**
 * タスクグループ（task_groups）1件のサマリーと、配下のタスク一覧・平均進捗率を取得する（カンバン画面用）。
 * RLS の SELECT ポリシーが可視範囲を絞り込むため、ここでは追加のテナント・権限フィルタは行わない。
 */
export async function getTaskGroupBoard(
  supabase: SupabaseClient<Database>,
  taskGroupId: string
): Promise<TaskGroupBoard> {
  const summary = await getTaskGroupSummary(supabase, taskGroupId)

  const { data: taskRows, error: taskError } = await supabase
    .from('tasks')
    .select('*')
    .eq('task_group_id', taskGroupId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (taskError) throw taskError

  const tasks = (taskRows ?? []).map(mapTask)

  return {
    ...summary,
    tasks,
    averageProgress: calculateAverageProgress(tasks.map(t => t.progressPercent)),
  }
}

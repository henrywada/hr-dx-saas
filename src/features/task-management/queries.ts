import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import type { TaskObjective, TaskMilestone, TaskGroup } from './types'

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

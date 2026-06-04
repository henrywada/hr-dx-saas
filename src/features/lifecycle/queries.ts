import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import type { LifecycleDashboardData, LifecycleTaskTemplate, InstanceRow, TaskRow } from './types'

/** テンプレート一覧を取得する */
export async function getTaskTemplates(): Promise<LifecycleTaskTemplate[]> {
  const user = await getServerUser()
  if (!user?.tenant_id) return []

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('lifecycle_task_templates')
    .select('id, tenant_id, lifecycle_type, title, description, sort_order, is_active, created_at')
    .eq('tenant_id', user.tenant_id)
    .eq('is_active', true)
    .order('lifecycle_type')
    .order('sort_order')

  if (error || !data) return []
  return data as LifecycleTaskTemplate[]
}

/** インスタンス一覧とそのタスクを取得する */
export async function getLifecycleInstances(): Promise<InstanceRow[]> {
  const user = await getServerUser()
  if (!user?.tenant_id) return []

  const supabase = await createClient()

  const { data: instances, error } = await supabase
    .from('lifecycle_instances')
    .select(
      'id, lifecycle_type, status, employee_id, scheduled_date, notes, created_at, completed_at'
    )
    .eq('tenant_id', user.tenant_id)
    .order('created_at', { ascending: false })
    .limit(200)

  if (error || !instances || instances.length === 0) return []

  // 従業員情報を一括取得
  const employeeIds = [...new Set(instances.map(i => i.employee_id))]
  const { data: employees } = await supabase
    .from('employees')
    .select('id, name, division_id, divisions(name)')
    .in('id', employeeIds)
    .eq('tenant_id', user.tenant_id)

  const empMap = new Map(
    (employees ?? []).map(e => {
      const divData = e.divisions as { name: string } | { name: string }[] | null
      const deptName = Array.isArray(divData) ? (divData[0]?.name ?? null) : (divData?.name ?? null)
      return [e.id, { name: e.name ?? '', deptName }]
    })
  )

  // タスクを一括取得
  const instanceIds = instances.map(i => i.id)
  const { data: tasks } = await supabase
    .from('lifecycle_tasks')
    .select(
      'id, instance_id, title, description, assignee_id, status, sort_order, due_date, completed_at'
    )
    .in('instance_id', instanceIds)
    .eq('tenant_id', user.tenant_id)
    .order('sort_order')

  // 担当者情報を一括取得
  const assigneeIds = [
    ...new Set((tasks ?? []).map(t => t.assignee_id).filter(Boolean)),
  ] as string[]
  const { data: assignees } =
    assigneeIds.length > 0
      ? await supabase.from('employees').select('id, name').in('id', assigneeIds)
      : { data: [] }
  const assigneeMap = new Map((assignees ?? []).map(a => [a.id, a.name ?? '']))

  // インスタンスごとのタスクをグループ化
  const tasksByInstance = new Map<string, TaskRow[]>()
  for (const t of tasks ?? []) {
    const arr = tasksByInstance.get(t.instance_id) ?? []
    arr.push({
      id: t.id,
      instance_id: t.instance_id,
      title: t.title,
      description: t.description,
      assignee_id: t.assignee_id,
      assignee_name: t.assignee_id ? (assigneeMap.get(t.assignee_id) ?? null) : null,
      status: t.status as TaskRow['status'],
      sort_order: t.sort_order,
      due_date: t.due_date,
      completed_at: t.completed_at,
    })
    tasksByInstance.set(t.instance_id, arr)
  }

  return instances.map(inst => {
    const emp = empMap.get(inst.employee_id)
    const instTasks = tasksByInstance.get(inst.id) ?? []
    const completedTasks = instTasks.filter(t => t.status === 'completed').length

    return {
      id: inst.id,
      lifecycle_type: inst.lifecycle_type as InstanceRow['lifecycle_type'],
      status: inst.status as InstanceRow['status'],
      employee_id: inst.employee_id,
      employee_name: emp?.name ?? '',
      department_name: emp?.deptName ?? null,
      scheduled_date: inst.scheduled_date,
      notes: inst.notes,
      created_at: inst.created_at,
      completed_at: inst.completed_at,
      tasks: instTasks,
      total_tasks: instTasks.length,
      completed_tasks: completedTasks,
    }
  })
}

/** ダッシュボード用データをまとめて取得する */
export async function getLifecycleDashboardData(): Promise<LifecycleDashboardData> {
  const [instances, templates] = await Promise.all([getLifecycleInstances(), getTaskTemplates()])

  return {
    onboardingInstances: instances.filter(i => i.lifecycle_type === 'onboarding'),
    offboardingInstances: instances.filter(i => i.lifecycle_type === 'offboarding'),
    templates,
  }
}

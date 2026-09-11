import type { SupabaseClient, PostgrestError } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import type {
  TaskObjective,
  TaskMilestone,
  TaskGroup,
  Task,
  TaskComment,
  TaskWorkLog,
} from './types'
import type { EmployeeOption } from './employee-filter'
import { calculateAverageProgress, groupProgressByParent } from './progress'
import {
  aggregateHoursByEmployee,
  aggregateHoursByGroup,
  type EmployeeHoursSummary,
  type GroupHoursSummary,
} from './work-log-summary'
import {
  buildOrgTreeGraph,
  layoutOrgTree,
  ORG_TREE_ROOT_ID,
  type OrgTreeGroupInput,
  type OrgTreeEmployeeRef,
  type OrgTreeTaskRow,
  type OrgTree,
} from './org-tree'

/** PostgREST（ローカル・本番とも）のデフォルト1リクエストあたり最大行数。`supabase/config.toml` の `max_rows` と一致させる */
const POSTGREST_MAX_ROWS = 1000

/**
 * PostgRESTの1000行上限（{@link POSTGREST_MAX_ROWS}）を超える結果セットを、
 * `.range()` によるページネーションで全件取得するヘルパー。
 *
 * `.range()` によるページ分割は行の並び順が安定していないと正しく全件を
 * 網羅できない（同じ行が複数ページに重複したり、逆に漏れたりしうる）ため、
 * `fetchPage` 側で必ず決定的な `.order()`（例：`.order('id')`）を指定すること。
 */
async function fetchAllRows<T>(
  fetchPage: (
    from: number,
    to: number
  ) => Promise<{ data: T[] | null; error: PostgrestError | null }>
): Promise<T[]> {
  const allRows: T[] = []
  let from = 0

  for (;;) {
    const to = from + POSTGREST_MAX_ROWS - 1
    const { data, error } = await fetchPage(from, to)
    if (error) throw error

    const rows = data ?? []
    allRows.push(...rows)

    if (rows.length < POSTGREST_MAX_ROWS) break
    from += POSTGREST_MAX_ROWS
  }

  return allRows
}

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
    goalSummary: row.goal_summary,
    status: row.status as TaskGroup['status'],
    sortOrder: row.sort_order,
  }
}

export interface ObjectiveDetail {
  objective: TaskObjective
  milestones: TaskMilestone[]
  taskGroupsByMilestoneId: Record<string, TaskGroup[]>
  /** マイルストーンID → そのマイルストーン配下全タスクのprogress_percentの単純平均（0-100） */
  milestoneProgressById: Record<string, number>
  /** 目標配下全タスクのprogress_percentの単純平均（0-100） */
  objectiveProgress: number
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

  // マイルストーン別・目標全体の進捗率を計算する（要求11）。
  // 全タスクの progress_percent をフラットに平均する（階層ごとの平均のさらに平均は取らない）。
  const groupIdToMilestoneId = new Map<string, string>()
  for (const [milestoneId, groups] of Object.entries(taskGroupsByMilestoneId)) {
    for (const group of groups) {
      groupIdToMilestoneId.set(group.id, milestoneId)
    }
  }

  const allGroupIds = Array.from(groupIdToMilestoneId.keys())
  const milestoneProgressById: Record<string, number> = {}
  let objectiveProgress = 0

  if (allGroupIds.length > 0) {
    const taskRows = await fetchAllRows(async (from, to) => {
      const result = await supabase
        .from('tasks')
        .select('progress_percent, task_group_id')
        .in('task_group_id', allGroupIds)
        .order('id', { ascending: true })
        .range(from, to)
      return { data: result.data, error: result.error }
    })

    const progressRows: { value: number; parentId: string }[] = []
    const allProgress: number[] = []

    for (const row of taskRows) {
      const milestoneId = groupIdToMilestoneId.get(row.task_group_id)
      if (!milestoneId) continue
      progressRows.push({ value: row.progress_percent, parentId: milestoneId })
      allProgress.push(row.progress_percent)
    }

    Object.assign(milestoneProgressById, groupProgressByParent(progressRows, milestoneIds))
    objectiveProgress = calculateAverageProgress(allProgress)
  } else {
    for (const milestoneId of milestoneIds) {
      milestoneProgressById[milestoneId] = 0
    }
  }

  return {
    objective: mapObjective(objectiveRow),
    milestones,
    taskGroupsByMilestoneId,
    milestoneProgressById,
    objectiveProgress,
  }
}

export interface ObjectiveSimpleView {
  objective: TaskObjective
  defaultTaskGroupId: string
  tasks: Task[]
}

/**
 * Phase5のシンプルUI用に、目標本体・デフォルトタスクグループID・配下タスク一覧をまとめて取得する。
 * 目標が複数タスクグループを持つ場合でも、作成日時が最も古いものを「デフォルト」として扱う。
 * RLS の SELECT ポリシーが可視範囲を絞り込むため、ここでは追加のテナント・権限フィルタは行わない。
 */
export async function getObjectiveSimpleView(
  supabase: SupabaseClient<Database>,
  objectiveId: string
): Promise<ObjectiveSimpleView> {
  const { data: objectiveRow, error: objectiveError } = await supabase
    .from('task_objectives')
    .select('*')
    .eq('id', objectiveId)
    .single()

  if (objectiveError) throw objectiveError

  const { data: milestoneRows, error: milestoneError } = await supabase
    .from('task_milestones')
    .select('id')
    .eq('objective_id', objectiveId)
    .order('created_at', { ascending: true })

  if (milestoneError) throw milestoneError
  if (!milestoneRows || milestoneRows.length === 0) {
    throw new Error('この目標にはマイルストーンが存在しません')
  }

  const milestoneIds = milestoneRows.map(m => m.id)

  const { data: groupRows, error: groupError } = await supabase
    .from('task_groups')
    .select('id')
    .in('milestone_id', milestoneIds)
    .order('created_at', { ascending: true })

  if (groupError) throw groupError
  if (!groupRows || groupRows.length === 0) {
    throw new Error('この目標にはタスクグループが存在しません')
  }

  const defaultTaskGroupId = groupRows[0].id
  const groupIds = groupRows.map(g => g.id)

  const { data: taskRows, error: taskError } = await supabase
    .from('tasks')
    .select('*, task_assignees(employee_id, role)')
    .in('task_group_id', groupIds)
    .order('created_at', { ascending: true })

  if (taskError) throw taskError

  return {
    objective: mapObjective(objectiveRow),
    defaultTaskGroupId,
    tasks: (taskRows ?? []).map(mapTask),
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

export interface TaskGroupParticipants {
  objectiveOwner: EmployeeOption | null
  managers: EmployeeOption[]
  members: EmployeeOption[]
}

/**
 * 目標責任者・タスクグループのマネージャー・メンバー一覧をまとめて取得する（宛先候補の算出用）。
 * `employees` は呼び出し元が既に取得済みの `getTenantEmployees()` の結果を渡す
 * （呼び出し元と重複してテナント従業員一覧を再取得しないため）。
 */
export async function getTaskGroupParticipants(
  supabase: SupabaseClient<Database>,
  taskGroupId: string,
  employees: EmployeeOption[]
): Promise<TaskGroupParticipants> {
  const summary = await getTaskGroupSummary(supabase, taskGroupId)
  const byId = new Map(employees.map(e => [e.id, e]))

  return {
    objectiveOwner: byId.get(summary.objectiveOwnerEmployeeId) ?? null,
    managers: summary.managerEmployeeIds
      .map(id => byId.get(id))
      .filter((e): e is EmployeeOption => Boolean(e)),
    members: summary.memberEmployeeIds
      .map(id => byId.get(id))
      .filter((e): e is EmployeeOption => Boolean(e)),
  }
}

/** DB行（snake_case、task_assigneesとのJOIN込み）を Task（camelCase）に変換する */
function mapTask(
  row: Database['public']['Tables']['tasks']['Row'] & {
    task_assignees: { employee_id: string; role: string }[] | null
  }
): Task {
  const assignees = row.task_assignees ?? []
  const responsibleAssignee = assignees.find(a => a.role === 'responsible')
  const memberAssignees = assignees.filter(a => a.role === 'member')

  return {
    id: row.id,
    tenantId: row.tenant_id,
    taskGroupId: row.task_group_id,
    title: row.title,
    description: row.description,
    goalSummary: row.goal_summary,
    createdByEmployeeId: row.created_by_employee_id,
    assigneeEmployeeIds: assignees.map(a => a.employee_id),
    responsibleEmployeeId: responsibleAssignee?.employee_id ?? null,
    memberEmployeeIds: memberAssignees.map(a => a.employee_id),
    status: row.status as Task['status'],
    progressPercent: row.progress_percent,
    priority: row.priority as Task['priority'],
    dueDate: row.due_date,
    sortOrder: row.sort_order,
  }
}

/**
 * 従業員選択UI（EmployeePicker）用に、テナント内の従業員一覧を id・氏名のみで取得する。
 * RLS の SELECT ポリシーが可視範囲（自テナント内）を絞り込むため、
 * ここでは追加のテナントフィルタは行わない。
 */
export async function getTenantEmployees(
  supabase: SupabaseClient<Database>
): Promise<EmployeeOption[]> {
  const { data, error } = await supabase
    .from('employees')
    .select('id, name, is_manager')
    .order('name', { ascending: true })

  if (error) throw error

  return (data ?? []).map(row => ({
    id: row.id,
    name: row.name ?? '（名前未設定）',
    isManager: row.is_manager ?? false,
  }))
}

/** タスク責任者候補（is_manager=trueの従業員）のみを取得する */
export async function getManagerEmployees(
  supabase: SupabaseClient<Database>
): Promise<EmployeeOption[]> {
  const employees = await getTenantEmployees(supabase)
  return employees.filter(e => e.isManager)
}

export interface DivisionOption {
  id: string
  name: string
  parentId: string | null
  layer: number
}

/**
 * `DivisionFilteredEmployeePicker` 用に、テナント内の組織階層（divisions）一覧を取得する。
 * RLS の SELECT ポリシーが可視範囲（自テナント内）を絞り込むため、追加のテナントフィルタは行わない。
 */
export async function getTenantDivisions(
  supabase: SupabaseClient<Database>
): Promise<DivisionOption[]> {
  const { data, error } = await supabase
    .from('divisions')
    .select('id, name, parent_id, layer')
    .order('layer', { ascending: true })

  if (error) throw error

  return (data ?? []).map(row => ({
    id: row.id,
    name: row.name ?? '（組織名未設定）',
    parentId: row.parent_id,
    layer: row.layer ?? 1,
  }))
}

/**
 * `DivisionFilteredEmployeePicker` 用に、従業員ID→所属division_idのマップを取得する。
 * 未配属の従業員は値が null になる。
 */
export async function getEmployeeDivisionMap(
  supabase: SupabaseClient<Database>
): Promise<Record<string, string | null>> {
  const { data, error } = await supabase.from('employees').select('id, division_id')

  if (error) throw error

  return Object.fromEntries((data ?? []).map(row => [row.id, row.division_id]))
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
    .select('*, task_assignees(employee_id, role)')
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

/** DB行（snake_case、employees とのJOIN込み）を TaskComment（camelCase）に変換する */
function mapComment(
  row: Database['public']['Tables']['task_comments']['Row'] & {
    employee: { name: string | null } | null
    target: { name: string | null } | null
  }
): TaskComment {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    taskId: row.task_id,
    taskGroupId: row.task_group_id,
    employeeId: row.employee_id,
    employeeName: row.employee?.name ?? '（名前未設定）',
    parentCommentId: row.parent_comment_id,
    commentType: row.comment_type as TaskComment['commentType'],
    targetEmployeeId: row.target_employee_id,
    targetEmployeeName: row.target?.name ?? null,
    body: row.body,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/**
 * タスクまたはタスクグループに紐づくコメント一覧を作成日時の昇順で取得する。
 * RLS の SELECT ポリシーが可視範囲を絞り込むため、ここでは追加のテナント・権限フィルタは行わない。
 */
export async function getTaskComments(
  supabase: SupabaseClient<Database>,
  target: { taskId: string } | { taskGroupId: string }
): Promise<TaskComment[]> {
  let query = supabase
    .from('task_comments')
    // task_comments は employees への FK を employee_id / target_employee_id の
    // 2本持つため、型推論の曖昧さを避けるために FK 制約名で明示的に指定する
    .select(
      '*, employee:employees!task_comments_employee_id_fkey(name), target:employees!task_comments_target_employee_id_fkey(name)'
    )
    .order('created_at', { ascending: true })

  query =
    'taskId' in target
      ? query.eq('task_id', target.taskId)
      : query.eq('task_group_id', target.taskGroupId)

  const { data, error } = await query

  if (error) throw error

  return (data ?? []).map(mapComment)
}

/** DB行（snake_case、employees とのJOIN込み）を TaskWorkLog（camelCase）に変換する */
function mapWorkLog(
  row: Database['public']['Tables']['task_work_logs']['Row'] & {
    employee: { name: string | null } | null
  }
): TaskWorkLog {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    taskId: row.task_id,
    employeeId: row.employee_id,
    employeeName: row.employee?.name ?? '（名前未設定）',
    workDate: row.work_date,
    hours: Number(row.hours),
    note: row.note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/**
 * タスク1件に紐づく工数記録一覧を作業日の降順で取得する（タスク詳細モーダル用）。
 * RLS の SELECT ポリシーが可視範囲を絞り込むため、ここでは追加のテナント・権限フィルタは行わない。
 */
export async function getTaskWorkLogs(
  supabase: SupabaseClient<Database>,
  taskId: string
): Promise<TaskWorkLog[]> {
  const { data, error } = await supabase
    .from('task_work_logs')
    .select('*, employee:employee_id(name)')
    .eq('task_id', taskId)
    .order('work_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) throw error

  return (data ?? []).map(mapWorkLog)
}

/** `task:task_id!inner(task_group_id)` 埋め込みフィルタで返る行の型（tasksとのFK関係は多対一のため単一オブジェクト） */
interface WorkLogWithTaskGroupRow {
  hours: number
  task: { task_group_id: string }
}

/**
 * タスクグループ1件配下の全タスクの工数を、メンバー別に合計して取得する（工数分布グラフ用）。
 * タスクID一覧を集めて `.in('task_id', taskIds)` する代わりに、埋め込みフィルタ
 * （`task:task_id!inner(...)` + `.eq('task.task_group_id', ...)`）で1クエリに統合している
 * （`src/features/hr-kpi/queries.ts` の `app_role:app_role_id!inner(...)` と同じ手法）。
 * これによりURL長がタスク件数ではなくクエリ自体の固定長で済み、大量タスクでもスケールする。
 * RLS の SELECT ポリシーが可視範囲を絞り込むため、ここでは追加のテナント・権限フィルタは行わない。
 */
export async function getWorkLogSummaryByGroup(
  supabase: SupabaseClient<Database>,
  taskGroupId: string
): Promise<EmployeeHoursSummary[]> {
  const { data, error } = await supabase
    .from('task_work_logs')
    .select('hours, employee_id, employee:employee_id(name), task:task_id!inner(task_group_id)')
    .eq('task.task_group_id', taskGroupId)

  if (error) throw error

  return aggregateHoursByEmployee(
    (data ?? []).map(row => ({
      employeeId: row.employee_id,
      employeeName: row.employee?.name ?? '（名前未設定）',
      hours: Number(row.hours),
    }))
  )
}

/**
 * 目標1件配下の全タスクグループの工数を、タスクグループ別に合計して取得する（工数分布グラフ用）。
 *
 * タスクグループ配下のタスクID一覧を収集してから `.in('task_id', taskIds)` する方式は、
 * マイルストーン・タスクグループ数が多い目標では taskIds 配列が肥大化し、
 * PostgREST／リバースプロキシのURL長上限に抵触して目標詳細ページ全体がクラッシュしうる。
 * 埋め込みフィルタ（`task:task_id!inner(task_group_id)` + `.in('task.task_group_id', groupIds)`）
 * に置き換えることで、配列サイズをタスク件数ではなくタスクグループ件数（はるかに小さい）に抑える
 * （`src/features/hr-kpi/queries.ts` の `app_role:app_role_id!inner(...)` と同じ手法）。
 * RLS の SELECT ポリシーが可視範囲を絞り込むため、ここでは追加のテナント・権限フィルタは行わない。
 */
export async function getWorkLogSummaryByObjective(
  supabase: SupabaseClient<Database>,
  objectiveId: string
): Promise<GroupHoursSummary[]> {
  const { data: milestoneRows, error: milestoneError } = await supabase
    .from('task_milestones')
    .select('id')
    .eq('objective_id', objectiveId)

  if (milestoneError) throw milestoneError

  const milestoneIds = (milestoneRows ?? []).map(m => m.id)
  if (milestoneIds.length === 0) return []

  const { data: groupRows, error: groupError } = await supabase
    .from('task_groups')
    .select('id, name')
    .in('milestone_id', milestoneIds)

  if (groupError) throw groupError
  if ((groupRows ?? []).length === 0) return []

  const groupIds = groupRows!.map(g => g.id)
  const groupNameById = new Map(groupRows!.map(g => [g.id, g.name]))

  const { data: logRows, error: logError } = await supabase
    .from('task_work_logs')
    .select('hours, task:task_id!inner(task_group_id)')
    .in('task.task_group_id', groupIds)

  if (logError) throw logError

  return aggregateHoursByGroup(
    ((logRows ?? []) as unknown as WorkLogWithTaskGroupRow[]).map(row => {
      const groupId = row.task.task_group_id
      return {
        taskGroupId: groupId,
        taskGroupName: groupNameById.get(groupId) ?? '（不明なグループ）',
        hours: Number(row.hours),
      }
    })
  )
}

export interface AssigneeHoursSummary {
  employeeId: string
  employeeName: string
  role: 'responsible' | 'member'
  totalHours: number
}

/** タスクグループ配下の工数記録を、担当者の役割（責任者/メンバー）別に集計する */
export async function getWorkLogSummaryByAssigneeRole(
  supabase: SupabaseClient<Database>,
  taskGroupId: string
): Promise<AssigneeHoursSummary[]> {
  const { data: taskRows, error: taskError } = await supabase
    .from('tasks')
    .select('id')
    .eq('task_group_id', taskGroupId)

  if (taskError) throw taskError

  const taskIds = (taskRows ?? []).map(t => t.id)
  if (taskIds.length === 0) return []

  const { data: logRows, error: logError } = await supabase
    .from('task_work_logs')
    .select('employee_id, hours, employee:employee_id(name)')
    .in('task_id', taskIds)

  if (logError) throw logError

  const { data: assigneeRows, error: assigneeError } = await supabase
    .from('task_assignees')
    .select('employee_id, role')
    .in('task_id', taskIds)

  if (assigneeError) throw assigneeError

  const roleByEmployeeId = new Map<string, 'responsible' | 'member'>()
  for (const row of assigneeRows ?? []) {
    if (row.role === 'responsible' || roleByEmployeeId.get(row.employee_id) !== 'responsible') {
      roleByEmployeeId.set(row.employee_id, row.role as 'responsible' | 'member')
    }
  }

  // hoursはDB上NUMERIC型のため、PostgRESTから文字列で返る（mapWorkLog等、既存の他関数と同じ変換）
  // 工数集計は共有ヘルパー（aggregateHoursByEmployee）に委譲する。totalHours降順ソート済みの配列が返るため、
  // 他のWorkDistributionChart系（getWorkLogSummaryByGroup等）と同じ並び順を維持できる
  const hoursSummary = aggregateHoursByEmployee(
    (logRows ?? []).map(row => ({
      employeeId: row.employee_id,
      employeeName: row.employee?.name ?? '（名前未設定）',
      hours: Number(row.hours),
    }))
  )

  // aggregateHoursByEmployeeの降順ソート順を維持したままroleを付与する
  return hoursSummary.map(({ employeeId, employeeName, totalHours }) => ({
    employeeId,
    employeeName,
    role: roleByEmployeeId.get(employeeId) ?? 'member',
    totalHours,
  }))
}

export interface ObjectiveWithProgress {
  objective: TaskObjective
  progress: number
}

/** `task_group:task_group_id!inner(milestone_id)` 埋め込みフィルタで返る行の型 */
interface TaskWithMilestoneRow {
  progress_percent: number
  task_group: { milestone_id: string }
}

/**
 * 自分が閲覧可能な目標一覧を、それぞれの進捗率（配下全タスクのprogress_percentの単純平均）付きで取得する（要求11）。
 *
 * 目標ごとに個別クエリを発行するとN+1になるため、可視な全目標→全マイルストーン→
 * （埋め込みフィルタで）全タスクの3クエリに抑える。タスクグループIDの配列を経由せず
 * `task_group:task_group_id!inner(milestone_id)` + `.in('task_group.milestone_id', milestoneIds)`
 * で直接タスクグループを介したフィルタを掛けることで、`.in()` に渡す配列サイズを
 * 目標配下のタスクグループ総数ではなくマイルストーン総数に抑える
 * （`getWorkLogSummaryByObjective` と同じ設計意図。詳細はそちらのコメント参照）。
 * RLS の SELECT ポリシーが可視範囲を絞り込むため、ここでは追加のテナント・権限フィルタは行わない。
 */
export async function getMyObjectivesWithProgress(
  supabase: SupabaseClient<Database>
): Promise<ObjectiveWithProgress[]> {
  const objectives = await getMyObjectives(supabase)
  if (objectives.length === 0) return []

  const objectiveIds = objectives.map(o => o.id)

  const { data: milestoneRows, error: milestoneError } = await supabase
    .from('task_milestones')
    .select('id, objective_id')
    .in('objective_id', objectiveIds)

  if (milestoneError) throw milestoneError

  const objectiveIdByMilestoneId = new Map((milestoneRows ?? []).map(m => [m.id, m.objective_id]))
  const milestoneIds = Array.from(objectiveIdByMilestoneId.keys())

  const progressRows: { value: number; parentId: string }[] = []

  if (milestoneIds.length > 0) {
    const taskRows = await fetchAllRows(async (from, to) => {
      const result = await supabase
        .from('tasks')
        .select('progress_percent, task_group:task_group_id!inner(milestone_id)')
        .in('task_group.milestone_id', milestoneIds)
        .order('id', { ascending: true })
        .range(from, to)
      return { data: result.data as unknown as TaskWithMilestoneRow[] | null, error: result.error }
    })

    for (const row of taskRows) {
      const objectiveId = objectiveIdByMilestoneId.get(row.task_group.milestone_id)
      if (!objectiveId) continue
      progressRows.push({ value: row.progress_percent, parentId: objectiveId })
    }
  }

  const progressByObjectiveId = groupProgressByParent(
    progressRows,
    objectives.map(o => o.id)
  )

  return objectives.map(objective => ({
    objective,
    progress: progressByObjectiveId[objective.id],
  }))
}

interface OrgTreeGroupPersonRow {
  task_group_id: string
  employee_id: string
  employee: { name: string | null } | null
}

/**
 * 指定したタスクID群のうち、閲覧者（currentEmployeeId）宛ての未読adviceコメント件数を
 * タスクID単位で集計する。既存の `/top` 通知フィードで使っている
 * `dashboard_feed_read_state`（従業員×dedupe_key単位の既読管理）をそのまま再利用し、
 * 新規テーブルは追加しない。task_comments と dashboard_feed_read_state は
 * FK関係を持たない（dedupe_keyは導出キーのため）ため、埋め込みJOINは使えず、
 * 2回のクエリをJS側で突き合わせる。
 */
export async function getUnreadAdviceCountsByTask(
  supabase: SupabaseClient<Database>,
  taskIds: string[],
  currentEmployeeId: string
): Promise<Record<string, number>> {
  if (taskIds.length === 0) return {}

  const { data: adviceRows, error: adviceError } = await supabase
    .from('task_comments')
    .select('id, task_id')
    .in('task_id', taskIds)
    .eq('comment_type', 'advice')
    .eq('target_employee_id', currentEmployeeId)

  if (adviceError) throw adviceError
  if (!adviceRows || adviceRows.length === 0) return {}

  const dedupeKeys = adviceRows.map(row => `task_management:comment:${row.id}`)

  const { data: readRows, error: readError } = await supabase
    .from('dashboard_feed_read_state')
    .select('dedupe_key')
    .eq('employee_id', currentEmployeeId)
    .in('dedupe_key', dedupeKeys)

  if (readError) throw readError

  const readKeySet = new Set((readRows ?? []).map(r => r.dedupe_key))

  const counts: Record<string, number> = {}
  for (const row of adviceRows) {
    if (!row.task_id) continue
    if (readKeySet.has(`task_management:comment:${row.id}`)) continue
    counts[row.task_id] = (counts[row.task_id] ?? 0) + 1
  }

  return counts
}

/**
 * 目標（task_objectives）配下の組織ツリー（責任者 → タスクグループ → {マネージャー・メンバー}）を、
 * 座標計算済みのノード・エッジとして取得する（要求10）。
 * RLS の SELECT ポリシーが可視範囲を絞り込むため、ここでは追加のテナント・権限フィルタは行わない。
 */
export async function getObjectiveOrgTree(
  supabase: SupabaseClient<Database>,
  objectiveId: string,
  currentEmployeeId: string | null
): Promise<OrgTree> {
  const { data: objectiveRow, error: objectiveError } = await supabase
    .from('task_objectives')
    .select('owner_employee_id, title')
    .eq('id', objectiveId)
    .single()

  if (objectiveError) throw objectiveError

  const { data: milestoneRows, error: milestoneError } = await supabase
    .from('task_milestones')
    .select('id')
    .eq('objective_id', objectiveId)

  if (milestoneError) throw milestoneError

  const milestoneIds = (milestoneRows ?? []).map(m => m.id)

  let groupRows: { id: string; name: string }[] = []
  if (milestoneIds.length > 0) {
    const { data, error } = await supabase
      .from('task_groups')
      .select('id, name')
      .in('milestone_id', milestoneIds)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })

    if (error) throw error
    groupRows = data ?? []
  }

  const groupIds = groupRows.map(g => g.id)

  let managerRows: OrgTreeGroupPersonRow[] = []
  let memberRows: OrgTreeGroupPersonRow[] = []
  let taskRows: {
    id: string
    task_group_id: string
    title: string
    goal_summary: string | null
    progress_percent: number
    task_assignees: { employee_id: string; employee: { name: string | null } | null }[] | null
  }[] = []

  if (groupIds.length > 0) {
    const [managerResultRows, memberResultRows] = await Promise.all([
      fetchAllRows(async (from, to) => {
        const result = await supabase
          .from('task_group_managers')
          .select('task_group_id, employee_id, employee:employee_id(name)')
          .in('task_group_id', groupIds)
          .order('employee_id', { ascending: true })
          .range(from, to)
        return { data: result.data, error: result.error }
      }),
      fetchAllRows(async (from, to) => {
        const result = await supabase
          .from('task_group_members')
          .select('task_group_id, employee_id, employee:employee_id(name)')
          .in('task_group_id', groupIds)
          .order('employee_id', { ascending: true })
          .range(from, to)
        return { data: result.data, error: result.error }
      }),
    ])
    managerRows = managerResultRows as unknown as OrgTreeGroupPersonRow[]
    memberRows = memberResultRows as unknown as OrgTreeGroupPersonRow[]

    taskRows = await fetchAllRows(async (from, to) => {
      const result = await supabase
        .from('tasks')
        .select(
          'id, task_group_id, title, goal_summary, progress_percent, task_assignees(employee_id, employee:employee_id(name))'
        )
        .in('task_group_id', groupIds)
        .order('id', { ascending: true })
        .range(from, to)
      return { data: result.data, error: result.error }
    })
  }

  // マネージャー・メンバーは埋め込みで氏名を取得済みのため、責任者のみ別途取得する
  const { data: ownerRow, error: ownerError } = await supabase
    .from('employees')
    .select('name')
    .eq('id', objectiveRow.owner_employee_id)
    .single()

  if (ownerError) throw ownerError

  const managersByGroupId = new Map<string, OrgTreeEmployeeRef[]>()
  for (const row of managerRows) {
    const list = managersByGroupId.get(row.task_group_id) ?? []
    list.push({ employeeId: row.employee_id, employeeName: row.employee?.name ?? '（名前未設定）' })
    managersByGroupId.set(row.task_group_id, list)
  }

  const membersByGroupId = new Map<string, OrgTreeEmployeeRef[]>()
  for (const row of memberRows) {
    const list = membersByGroupId.get(row.task_group_id) ?? []
    list.push({ employeeId: row.employee_id, employeeName: row.employee?.name ?? '（名前未設定）' })
    membersByGroupId.set(row.task_group_id, list)
  }

  const sortByName = (a: OrgTreeEmployeeRef, b: OrgTreeEmployeeRef) =>
    a.employeeName.localeCompare(b.employeeName, 'ja')

  // 最終レビュー Finding 2: 「既定タスクグループ」等の内部実装名はUIに一切出さない
  // 方針（design.md セクション2.1）のため、DB上の task_groups.name をそのまま
  // ノードラベルに使わず、目標のタイトルを流用する（1目標=1タスクグループのPhase5構成では
  // 「タスクグループ」という概念自体がユーザーに見えるべきではない）。
  const groups: OrgTreeGroupInput[] = groupRows.map(g => ({
    taskGroupId: g.id,
    taskGroupName: objectiveRow.title,
    managers: (managersByGroupId.get(g.id) ?? []).sort(sortByName),
    members: (membersByGroupId.get(g.id) ?? []).sort(sortByName),
  }))

  const tasks: OrgTreeTaskRow[] = taskRows.map(row => ({
    id: row.id,
    taskGroupId: row.task_group_id,
    title: row.title,
    goalSummary: row.goal_summary,
    assignees: (row.task_assignees ?? []).map(a => ({
      employeeId: a.employee_id,
      employeeName: a.employee?.name ?? '（名前未設定）',
    })),
    progressPercent: row.progress_percent,
  }))

  const { nodes, edges } = buildOrgTreeGraph({
    ownerEmployeeId: objectiveRow.owner_employee_id,
    ownerEmployeeName: ownerRow.name ?? '（名前未設定）',
    groups,
    tasks,
  })

  const unreadAdviceCountsByTaskId = currentEmployeeId
    ? await getUnreadAdviceCountsByTask(
        supabase,
        tasks.map(t => t.id),
        currentEmployeeId
      )
    : {}

  const nodesWithUnread = nodes.map(node =>
    node.role === 'task'
      ? {
          ...node,
          unreadAdviceCount: unreadAdviceCountsByTaskId[node.id.replace('task:', '')] ?? 0,
        }
      : node
  )

  return {
    nodes: layoutOrgTree(nodesWithUnread, edges, ORG_TREE_ROOT_ID),
    edges,
  }
}

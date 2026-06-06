import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import type {
  Objective,
  KeyResult,
  Checkin,
  ObjectiveWithDetails,
  KeyResultWithCheckins,
  OkrDashboardData,
  OkrSummary,
  DivisionAchievementRow,
} from './types'

/** KRの進捗計算（定量型）*/
function calcKrProgress(start: number, current: number, target: number): number {
  if (target === start) return 100
  const raw = ((current - start) / (target - start)) * 100
  return Math.min(100, Math.max(0, Math.round(raw * 100) / 100))
}

/** Objectiveの進捗 = KR進捗の加重平均（キャンセル済み除外）*/
export function calcObjectiveProgress(keyResults: KeyResult[]): number {
  const active = keyResults.filter(kr => kr.status !== 'cancelled')
  if (active.length === 0) return 0
  const totalWeight = active.reduce((sum, kr) => sum + kr.weight, 0)
  if (totalWeight === 0) return 0
  const weightedSum = active.reduce((sum, kr) => sum + kr.progress * kr.weight, 0)
  return Math.round((weightedSum / totalWeight) * 100) / 100
}

/** KR一覧を最新チェックイン付きで取得する */
async function fetchKeyResultsWithCheckins(
  supabase: Awaited<ReturnType<typeof createClient>>,
  objectiveIds: string[],
  tenantId: string
): Promise<Map<string, KeyResultWithCheckins[]>> {
  if (objectiveIds.length === 0) return new Map()

  const { data: krs } = await supabase
    .from('key_results')
    .select('*')
    .in('objective_id', objectiveIds)
    .eq('tenant_id', tenantId)
    .order('sort_order')

  if (!krs || krs.length === 0) return new Map()

  const krIds = krs.map(kr => kr.id)
  const { data: checkins } = await supabase
    .from('checkins')
    .select('*')
    .in('key_result_id', krIds)
    .eq('tenant_id', tenantId)
    .order('checkin_date', { ascending: false })

  const checkinsByKr = new Map<string, Checkin[]>()
  for (const c of checkins ?? []) {
    const arr = checkinsByKr.get(c.key_result_id) ?? []
    arr.push(c as Checkin)
    checkinsByKr.set(c.key_result_id, arr)
  }

  const krWithCheckins: KeyResultWithCheckins[] = krs.map(kr => {
    const krCheckins = checkinsByKr.get(kr.id) ?? []
    return {
      ...(kr as KeyResult),
      latest_checkin: krCheckins[0] ?? null,
      checkin_count: krCheckins.length,
      checkins: krCheckins,
    }
  })

  const resultMap = new Map<string, KeyResultWithCheckins[]>()
  for (const kr of krWithCheckins) {
    const arr = resultMap.get(kr.objective_id) ?? []
    arr.push(kr)
    resultMap.set(kr.objective_id, arr)
  }
  return resultMap
}

/** Objective配列にKR・子目標・オーナー名を付与して ObjectiveWithDetails に変換する */
function buildObjectiveWithDetails(
  obj: Objective,
  krMap: Map<string, KeyResultWithCheckins[]>,
  allObjectives: Objective[],
  ownerMap: Map<string, string>
): ObjectiveWithDetails {
  const krs = krMap.get(obj.id) ?? []
  const children = allObjectives
    .filter(o => o.parent_id === obj.id)
    .map(child => buildObjectiveWithDetails(child, krMap, allObjectives, ownerMap))

  let owner_name: string | null = null
  if (obj.owner_employee_id) owner_name = ownerMap.get(obj.owner_employee_id) ?? null
  else if (obj.owner_division_id) owner_name = ownerMap.get(obj.owner_division_id) ?? null

  return { ...obj, key_results: krs, children, owner_name }
}

/** OKRダッシュボード用全データを取得する */
export async function getOkrDashboardData(
  fiscalYear: number,
  halfYear: 'first' | 'second' | null = null
): Promise<OkrDashboardData> {
  const user = await getServerUser()
  const empty: OkrDashboardData = {
    companyObjectives: [],
    divisionObjectives: [],
    myObjectives: [],
    teamObjectives: [],
    summary: {
      totalObjectives: 0,
      activeObjectives: 0,
      completedObjectives: 0,
      averageProgress: 0,
      totalKeyResults: 0,
    },
    divisions: [],
  }
  if (!user?.tenant_id) return empty

  const tenantId = user.tenant_id
  const supabase = await createClient()

  let query = supabase
    .from('objectives')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('fiscal_year', fiscalYear)
    .order('sort_order')

  if (halfYear) {
    query = query.eq('half_year', halfYear)
  }

  const [{ data: objectives }, { data: divisions }] = await Promise.all([
    query,
    supabase.from('divisions').select('id, name').eq('tenant_id', tenantId).order('name'),
  ])

  const allObjectives = (objectives ?? []) as Objective[]

  if (allObjectives.length === 0) {
    return {
      ...empty,
      divisions: (divisions ?? []).map(d => ({ id: d.id, name: d.name ?? '' })),
    }
  }

  const objectiveIds = allObjectives.map(o => o.id)
  const krMap = await fetchKeyResultsWithCheckins(supabase, objectiveIds, tenantId)

  const employeeIds = allObjectives.filter(o => o.owner_employee_id).map(o => o.owner_employee_id!)
  const divisionIds = allObjectives.filter(o => o.owner_division_id).map(o => o.owner_division_id!)

  const ownerMap = new Map<string, string>()
  const [{ data: emps }, { data: divs }] = await Promise.all([
    employeeIds.length > 0
      ? supabase
          .from('employees')
          .select('id, name')
          .in('id', [...new Set(employeeIds)])
      : Promise.resolve({ data: [] }),
    divisionIds.length > 0
      ? supabase
          .from('divisions')
          .select('id, name')
          .in('id', [...new Set(divisionIds)])
      : Promise.resolve({ data: [] }),
  ])
  for (const e of emps ?? []) ownerMap.set(e.id, e.name ?? '')
  for (const d of divs ?? []) ownerMap.set(d.id, d.name ?? '')

  const rootObjectives = allObjectives.filter(o => !o.parent_id)
  const buildList = (filterFn: (o: Objective) => boolean) =>
    rootObjectives
      .filter(filterFn)
      .map(o => buildObjectiveWithDetails(o, krMap, allObjectives, ownerMap))

  const companyObjectives = buildList(o => o.owner_type === 'company')
  const divisionObjectives = buildList(o => o.owner_type === 'division')
  const myObjectives = buildList(
    o => o.owner_type === 'employee' && o.owner_employee_id === user.employee_id
  )
  const teamObjectives = user.is_manager
    ? buildList(o => o.owner_type === 'employee' && o.owner_employee_id !== user.employee_id)
    : []

  const activeObjectives = allObjectives.filter(o => o.status === 'active').length
  const completedObjectives = allObjectives.filter(o => o.status === 'completed').length
  const avgProgress =
    allObjectives.length > 0
      ? Math.round(
          (allObjectives.reduce((sum, o) => sum + (o.progress ?? 0), 0) / allObjectives.length) *
            100
        ) / 100
      : 0

  let totalKeyResults = 0
  for (const krs of krMap.values()) totalKeyResults += krs.length

  const summary: OkrSummary = {
    totalObjectives: allObjectives.length,
    activeObjectives,
    completedObjectives,
    averageProgress: avgProgress,
    totalKeyResults,
  }

  return {
    companyObjectives,
    divisionObjectives,
    myObjectives,
    teamObjectives,
    summary,
    divisions: (divisions ?? []).map(d => ({ id: d.id, name: d.name ?? '' })),
  }
}

/** 目標詳細とKR一覧を取得する */
export async function getObjectiveDetail(
  objectiveId: string
): Promise<ObjectiveWithDetails | null> {
  const user = await getServerUser()
  if (!user?.tenant_id) return null

  const supabase = await createClient()

  const { data: obj } = await supabase
    .from('objectives')
    .select('*')
    .eq('id', objectiveId)
    .eq('tenant_id', user.tenant_id)
    .single()

  if (!obj) return null

  const krMap = await fetchKeyResultsWithCheckins(supabase, [objectiveId], user.tenant_id)

  const ownerMap = new Map<string, string>()
  const [{ data: emp }, { data: div }] = await Promise.all([
    obj.owner_employee_id
      ? supabase.from('employees').select('id, name').eq('id', obj.owner_employee_id).single()
      : Promise.resolve({ data: null }),
    obj.owner_division_id
      ? supabase.from('divisions').select('id, name').eq('id', obj.owner_division_id).single()
      : Promise.resolve({ data: null }),
  ])
  if (emp) ownerMap.set(emp.id, emp.name ?? '')
  if (div) ownerMap.set(div.id, div.name ?? '')

  return buildObjectiveWithDetails(obj as Objective, krMap, [], ownerMap)
}

/** ツリービュー用：指定年度のすべての目標を階層構造で取得する */
export async function getObjectiveTree(fiscalYear: number): Promise<ObjectiveWithDetails[]> {
  const user = await getServerUser()
  if (!user?.tenant_id) return []

  const supabase = await createClient()

  const { data: objectives } = await supabase
    .from('objectives')
    .select('*')
    .eq('tenant_id', user.tenant_id)
    .eq('fiscal_year', fiscalYear)
    .order('sort_order')

  const allObjectives = (objectives ?? []) as Objective[]
  if (allObjectives.length === 0) return []

  const objectiveIds = allObjectives.map(o => o.id)
  const krMap = await fetchKeyResultsWithCheckins(supabase, objectiveIds, user.tenant_id)

  const employeeIds = allObjectives.filter(o => o.owner_employee_id).map(o => o.owner_employee_id!)
  const divisionIds = allObjectives.filter(o => o.owner_division_id).map(o => o.owner_division_id!)

  const ownerMap = new Map<string, string>()
  const [{ data: emps }, { data: divs }] = await Promise.all([
    employeeIds.length > 0
      ? supabase
          .from('employees')
          .select('id, name')
          .in('id', [...new Set(employeeIds)])
      : Promise.resolve({ data: [] }),
    divisionIds.length > 0
      ? supabase
          .from('divisions')
          .select('id, name')
          .in('id', [...new Set(divisionIds)])
      : Promise.resolve({ data: [] }),
  ])
  for (const e of emps ?? []) ownerMap.set(e.id, e.name ?? '')
  for (const d of divs ?? []) ownerMap.set(d.id, d.name ?? '')

  return allObjectives
    .filter(o => !o.parent_id)
    .map(o => buildObjectiveWithDetails(o, krMap, allObjectives, ownerMap))
}

/** 指定KRのチェックイン履歴を取得する */
export async function getCheckinHistory(
  keyResultId: string,
  limit = 20
): Promise<(Checkin & { employee_name: string })[]> {
  const user = await getServerUser()
  if (!user?.tenant_id) return []

  const supabase = await createClient()

  const { data: checkins } = await supabase
    .from('checkins')
    .select('*')
    .eq('key_result_id', keyResultId)
    .eq('tenant_id', user.tenant_id)
    .order('checkin_date', { ascending: false })
    .limit(limit)

  if (!checkins || checkins.length === 0) return []

  const employeeIds = [...new Set(checkins.map(c => c.employee_id))]
  const { data: emps } = await supabase.from('employees').select('id, name').in('id', employeeIds)
  const empMap = new Map((emps ?? []).map(e => [e.id, e.name ?? '']))

  return checkins.map(c => ({
    ...(c as Checkin),
    employee_name: empMap.get(c.employee_id) ?? '',
  }))
}

/** 部署別平均達成率を取得する（Recharts用）*/
export async function getAchievementRateByDivision(
  fiscalYear: number
): Promise<DivisionAchievementRow[]> {
  const user = await getServerUser()
  if (!user?.tenant_id) return []

  const supabase = await createClient()

  const { data: objectives } = await supabase
    .from('objectives')
    .select('owner_division_id, progress, status')
    .eq('tenant_id', user.tenant_id)
    .eq('fiscal_year', fiscalYear)
    .eq('owner_type', 'division')
    .neq('status', 'cancelled')

  if (!objectives || objectives.length === 0) return []

  const divisionIds = [
    ...new Set(objectives.filter(o => o.owner_division_id).map(o => o.owner_division_id!)),
  ]
  if (divisionIds.length === 0) return []

  const { data: divisions } = await supabase
    .from('divisions')
    .select('id, name')
    .in('id', divisionIds)

  const divMap = new Map((divisions ?? []).map(d => [d.id, d.name ?? '']))

  const grouped = new Map<string, number[]>()
  for (const obj of objectives) {
    if (!obj.owner_division_id) continue
    const arr = grouped.get(obj.owner_division_id) ?? []
    arr.push(obj.progress ?? 0)
    grouped.set(obj.owner_division_id, arr)
  }

  return [...grouped.entries()].map(([divId, progresses]) => ({
    division_id: divId,
    division_name: divMap.get(divId) ?? divId,
    avg_progress: Math.round((progresses.reduce((s, p) => s + p, 0) / progresses.length) * 10) / 10,
    objective_count: progresses.length,
  }))
}

// calcKrProgress は actions.ts でも使用するためここでエクスポート
export { calcKrProgress }

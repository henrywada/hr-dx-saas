// src/features/skill-map/queries.ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import type {
  TenantSkill,
  TenantSkillWithRequirements,
  SkillLevel,
  SkillRequirement,
  EmployeeSkillAssignment,
  EmployeeSkillRow,
  SkillGroupRow,
  EmployeeCompletionRow,
  TenantSkillLevelSet,
  TenantSkillLevelSetWithLevels,
  CourseSkillLevelMapping,
  ProjectSimulation,
  SimulationPosition,
  SimulationPositionRequirement,
  EmployeeCareerGoal,
  EmployeeSkillRequirementHistory,
} from './types'
import type { DivisionHierarchyNode } from './division-paths'

type DB = SupabaseClient<Database>

export async function getTenantSkills(supabase: DB): Promise<TenantSkill[]> {
  const { data, error } = await (supabase as any)
    .from('tenant_skills')
    .select('*')
    .order('sort_order', { ascending: true })
  if (error) throw error
  return data ?? []
}

/** skill-tempCopy 用: テナント職種 + 紐づく要件（level情報込み）を一括取得 */
export async function getTenantSkillsWithRequirements(
  supabase: DB
): Promise<TenantSkillWithRequirements[]> {
  const { data: skills, error: skillError } = await (supabase as any)
    .from('tenant_skills')
    .select('*')
    .order('sort_order', { ascending: true })
  if (skillError) throw skillError
  if (!skills?.length) return []

  const skillIds = (skills as TenantSkill[]).map(s => s.id)
  const { data: reqs, error: reqError } = await (supabase as any)
    .from('skill_requirements')
    .select('*, level:skill_levels(*)')
    .in('skill_id', skillIds)
    .order('sort_order', { ascending: true })
  if (reqError) throw reqError

  const reqsBySkill = new Map<string, SkillRequirement[]>()
  for (const req of (reqs ?? []) as SkillRequirement[]) {
    const list = reqsBySkill.get(req.skill_id) ?? []
    list.push(req)
    reqsBySkill.set(req.skill_id, list)
  }

  return (skills as TenantSkill[]).map(skill => ({
    ...skill,
    requirements: reqsBySkill.get(skill.id) ?? [],
  }))
}

export async function getSkillLevels(supabase: DB): Promise<SkillLevel[]> {
  const { data, error } = await (supabase as any)
    .from('skill_levels')
    .select('*')
    .order('sort_order', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function getEmployeeSkillAssignments(
  supabase: DB,
  employeeId: string
): Promise<EmployeeSkillAssignment[]> {
  const { data, error } = await (supabase as any)
    .from('employee_skill_assignments')
    .select('*, skill:tenant_skills(*)')
    .eq('employee_id', employeeId)
    .order('started_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

/** 従業員が On にした技能要件（requirement_id の集合。行が無い＝Off） */
export async function getEmployeeSkillRequirementSelections(
  supabase: DB,
  employeeId: string
): Promise<Set<string>> {
  const { data, error } = await (supabase as any)
    .from('employee_skill_requirement_selections')
    .select('requirement_id')
    .eq('employee_id', employeeId)
  if (error) throw error
  return new Set((data ?? []).map((r: { requirement_id: string }) => r.requirement_id))
}

/** 複数従業員の技能要件選択を一括取得（職種ビューのレベル表示用） */
export async function getEmployeeSkillRequirementSelectionsBatch(
  supabase: DB,
  employeeIds: string[]
): Promise<Map<string, Set<string>>> {
  if (employeeIds.length === 0) return new Map()
  const { data, error } = await (supabase as any)
    .from('employee_skill_requirement_selections')
    .select('employee_id, requirement_id')
    .in('employee_id', employeeIds)
  if (error) throw error
  const map = new Map<string, Set<string>>()
  for (const r of data ?? []) {
    const eid = r.employee_id as string
    const rid = r.requirement_id as string
    if (!map.has(eid)) map.set(eid, new Set())
    map.get(eid)!.add(rid)
  }
  return map
}

// 現在有効な割り当て = employee_id × skill_id で started_at が最新の行
export async function getEmployeeSkillRows(
  supabase: DB,
  divisionId?: string
): Promise<EmployeeSkillRow[]> {
  let empQuery = (supabase as any)
    .from('employees')
    .select('id, employee_no, name, division_id, divisions:divisions(id, name, code)')
    .eq('active_status', 'active')

  if (divisionId) empQuery = empQuery.eq('division_id', divisionId)

  const { data: employees, error: empError } = await empQuery
  if (empError) throw empError

  const employeeIds = (employees ?? []).map((e: any) => e.id)
  if (employeeIds.length === 0) return []

  const { data: assignments, error: assignError } = await (supabase as any)
    .from('employee_skill_assignments')
    .select('*, skill:tenant_skills(*)')
    .in('employee_id', employeeIds)
    .order('started_at', { ascending: false })
  if (assignError) throw assignError

  // JS側で DISTINCT ON (employee_id, skill_id) を再現
  const currentMap: Record<string, Record<string, EmployeeSkillAssignment>> = {}
  for (const a of assignments ?? []) {
    if (!currentMap[a.employee_id]) currentMap[a.employee_id] = {}
    if (!currentMap[a.employee_id][a.skill_id]) {
      currentMap[a.employee_id][a.skill_id] = a
    }
  }

  const rows: EmployeeSkillRow[] = (employees ?? []).map((emp: any) => {
    const current = currentMap[emp.id] ?? {}
    const startedAts = Object.values(current).map(a => (a as EmployeeSkillAssignment).started_at)
    const latestStartedAt = startedAts.length > 0 ? startedAts.sort().reverse()[0] : null
    return {
      employee_id: emp.id,
      employee_no: emp.employee_no ?? null,
      full_name: emp.name ?? null,
      division_code: (emp.divisions as any)?.code ?? null,
      division_name: (emp.divisions as any)?.name ?? null,
      division_id: emp.division_id ?? null,
      currentAssignments: current,
      latestStartedAt,
    }
  })

  // テーブル表示順: divisions.code → 社員番号（未配属・コードなしは後方）
  const sortKeyCode = (c: string | null) => (c?.trim() ? c.trim() : '\uffff')
  const sortKeyNo = (n: string | null) => (n?.trim() ? n.trim() : '\uffff')

  rows.sort((a, b) => {
    const dc = sortKeyCode(a.division_code).localeCompare(sortKeyCode(b.division_code), 'ja', {
      numeric: true,
    })
    if (dc !== 0) return dc
    return sortKeyNo(a.employee_no).localeCompare(sortKeyNo(b.employee_no), 'ja', { numeric: true })
  })

  return rows
}

/** テナント配下の全 divisions（親子情報つき）。RLS でテナント分離。 */
export async function getTenantDivisionHierarchy(supabase: DB): Promise<DivisionHierarchyNode[]> {
  const { data, error } = await (supabase as any)
    .from('divisions')
    .select('id, name, parent_id')
    .order('name', { ascending: true })
  if (error) throw error
  return (data ?? []).map((r: any) => ({
    id: r.id as string,
    name: r.name ?? null,
    parent_id: r.parent_id ?? null,
  }))
}

export async function getSkillGroupRows(supabase: DB): Promise<SkillGroupRow[]> {
  const skills = await getTenantSkills(supabase)

  const { data: assignments, error } = await (supabase as any)
    .from('employee_skill_assignments')
    .select(
      'employee_id, skill_id, started_at, employees:employees!employee_skill_assignments_employee_id_fkey(id, name, employee_no, divisions:divisions(name))'
    )
    .order('started_at', { ascending: false })
  if (error) throw error

  const seen: Record<string, Set<string>> = {}
  const grouped: Record<
    string,
    Array<{
      employee_id: string
      employee_no: string | null
      full_name: string | null
      division_name: string | null
      started_at: string
    }>
  > = {}

  for (const a of assignments ?? []) {
    if (!seen[a.skill_id]) seen[a.skill_id] = new Set()
    if (seen[a.skill_id].has(a.employee_id)) continue
    seen[a.skill_id].add(a.employee_id)
    if (!grouped[a.skill_id]) grouped[a.skill_id] = []
    const emp = a.employees as any
    grouped[a.skill_id].push({
      employee_id: a.employee_id,
      employee_no: emp?.employee_no ?? null,
      full_name: emp?.name ?? null,
      division_name: emp?.divisions?.name ?? null,
      started_at: a.started_at,
    })
  }

  return skills.map(skill => ({ skill, employees: grouped[skill.id] ?? [] }))
}

/** 分析ビュー用: 従業員ごとの職種要件充足状況を集計する */
export async function getSkillCompletionData(
  supabase: DB,
  divisionId?: string
): Promise<EmployeeCompletionRow[]> {
  let empQuery = (supabase as any)
    .from('employees')
    .select('id, employee_no, name, division_id, divisions:divisions(id, name, code)')
    .eq('active_status', 'active')

  if (divisionId) empQuery = empQuery.eq('division_id', divisionId)

  const { data: employees, error: empError } = await empQuery
  if (empError) throw empError
  if (!employees?.length) return []

  const employeeIds = (employees as any[]).map((e: any) => e.id)

  // 割り当て職種を取得
  const { data: assignments, error: assignError } = await (supabase as any)
    .from('employee_skill_assignments')
    .select('employee_id, skill_id')
    .in('employee_id', employeeIds)
  if (assignError) throw assignError

  // employee_id → Set<skill_id>（重複除去）
  const skillsByEmployee = new Map<string, Set<string>>()
  for (const a of assignments ?? []) {
    if (!skillsByEmployee.has(a.employee_id)) skillsByEmployee.set(a.employee_id, new Set())
    skillsByEmployee.get(a.employee_id)!.add(a.skill_id)
  }

  // 割り当てられた全職種の要件を取得
  const allSkillIds = [...new Set((assignments ?? []).map((a: any) => a.skill_id as string))]
  let requirementsBySkill = new Map<string, Array<{ id: string; name: string }>>()
  if (allSkillIds.length > 0) {
    const { data: reqs, error: reqError } = await (supabase as any)
      .from('skill_requirements')
      .select('id, skill_id, name')
      .in('skill_id', allSkillIds)
    if (reqError) throw reqError
    for (const r of reqs ?? []) {
      const list = requirementsBySkill.get(r.skill_id) ?? []
      list.push({ id: r.id, name: r.name })
      requirementsBySkill.set(r.skill_id, list)
    }
  }

  // ON になっている要件 ID を取得
  const { data: selections, error: selError } = await (supabase as any)
    .from('employee_skill_requirement_selections')
    .select('employee_id, requirement_id')
    .in('employee_id', employeeIds)
  if (selError) throw selError

  // employee_id → Set<requirement_id>
  const selectionsByEmployee = new Map<string, Set<string>>()
  for (const s of selections ?? []) {
    if (!selectionsByEmployee.has(s.employee_id)) selectionsByEmployee.set(s.employee_id, new Set())
    selectionsByEmployee.get(s.employee_id)!.add(s.requirement_id)
  }

  // 各従業員の充足状況を組み立て
  const rows: EmployeeCompletionRow[] = (employees as any[]).map((emp: any) => {
    const assignedSkillIds = [...(skillsByEmployee.get(emp.id) ?? [])]
    const selectedReqIds = selectionsByEmployee.get(emp.id) ?? new Set<string>()

    const requirementCompletions: Record<string, boolean> = {}
    let totalRequirements = 0

    for (const skillId of assignedSkillIds) {
      const reqs = requirementsBySkill.get(skillId) ?? []
      for (const req of reqs) {
        requirementCompletions[req.id] = selectedReqIds.has(req.id)
        totalRequirements++
      }
    }

    const completedRequirements = Object.values(requirementCompletions).filter(Boolean).length
    const completionRate =
      totalRequirements > 0 ? Math.round((completedRequirements / totalRequirements) * 100) : null

    return {
      employee_id: emp.id,
      employee_no: emp.employee_no ?? null,
      full_name: emp.name ?? null,
      division_name: (emp.divisions as any)?.name ?? null,
      division_id: emp.division_id ?? null,
      assignedSkillIds,
      requirementCompletions,
      totalRequirements,
      completedRequirements,
      completionRate,
    }
  })

  // divisions.code → employee_no 順でソート（未配属・コードなしは後方）
  const sortKeyCode = (c: string | null) => (c?.trim() ? c.trim() : '￿')
  const sortKeyNo = (n: string | null) => (n?.trim() ? n.trim() : '￿')
  rows.sort((a, b) => {
    const dc = sortKeyCode(
      (employees as any[]).find((e: any) => e.id === a.employee_id)?.divisions?.code ?? null
    ).localeCompare(
      sortKeyCode(
        (employees as any[]).find((e: any) => e.id === b.employee_id)?.divisions?.code ?? null
      ),
      'ja',
      { numeric: true }
    )
    if (dc !== 0) return dc
    return sortKeyNo(a.employee_no).localeCompare(sortKeyNo(b.employee_no), 'ja', { numeric: true })
  })

  return rows
}

/** セット未設定のスキルレベル一覧（テンプレートコピー由来など） */
export async function getStandaloneSkillLevels(supabase: DB): Promise<SkillLevel[]> {
  const { data, error } = await (supabase as any)
    .from('skill_levels')
    .select('*')
    .is('skill_level_set_id', null)
    .order('sort_order')
    .order('created_at')
  if (error) {
    console.warn('[getStandaloneSkillLevels] select failed:', error.message)
    return []
  }
  return (data ?? []) as SkillLevel[]
}

/** テナント固有スキルレベルセット一覧（レベルネスト） */
export async function getTenantSkillLevelSetsWithLevels(
  supabase: DB
): Promise<TenantSkillLevelSetWithLevels[]> {
  const { data: sets, error } = await (supabase as any)
    .from('tenant_skill_level_sets')
    .select('*')
    .order('sort_order')
    .order('created_at')
  if (error) {
    console.warn('[getTenantSkillLevelSetsWithLevels] sets select failed:', error.message)
    return []
  }
  const rows = (sets ?? []) as TenantSkillLevelSet[]
  if (rows.length === 0) return []

  const setIds = rows.map(s => s.id)
  const { data: lvRows, error: lvErr } = await (supabase as any)
    .from('skill_levels')
    .select('*')
    .in('skill_level_set_id', setIds)
    .order('sort_order')
    .order('created_at')
  if (lvErr) {
    console.warn('[getTenantSkillLevelSetsWithLevels] levels select failed:', lvErr.message)
  }
  const levels = (lvRows ?? []) as SkillLevel[]

  const levelsBySet = new Map<string, SkillLevel[]>()
  for (const lv of levels) {
    if (!lv.skill_level_set_id) continue
    const list = levelsBySet.get(lv.skill_level_set_id) ?? []
    list.push(lv)
    levelsBySet.set(lv.skill_level_set_id, list)
  }

  return rows.map(s => ({
    ...s,
    levels: levelsBySet.get(s.id) ?? [],
  }))
}

/** スキルレベルIDのリストに対応するeラーニングコースマッピングを一括取得（N+1防止） */
export async function getAllCourseMappingsForLevelSet(
  supabase: DB,
  levelIds: string[]
): Promise<Map<string, CourseSkillLevelMapping[]>> {
  if (levelIds.length === 0) return new Map()
  const { data, error } = await (supabase as any)
    .from('el_course_skill_level_mappings')
    .select('id, course_id, skill_level_id, created_at, course:el_courses(id, title)')
    .in('skill_level_id', levelIds)
    .order('created_at', { ascending: true })
  if (error) {
    console.warn('[getAllCourseMappingsForLevelSet] failed:', error.message)
    return new Map()
  }
  const map = new Map<string, CourseSkillLevelMapping[]>()
  for (const row of (data ?? []) as CourseSkillLevelMapping[]) {
    const list = map.get(row.skill_level_id) ?? []
    list.push(row)
    map.set(row.skill_level_id, list)
  }
  return map
}

/** eラーニング連動ドロップダウン用：テナントのコース一覧（ドラフト含む） */
export async function getAvailableCoursesForLevelMapping(
  supabase: DB
): Promise<Array<{ id: string; title: string; status: string }>> {
  const { data, error } = await (supabase as any)
    .from('el_courses')
    .select('id, title, status')
    .eq('course_type', 'tenant')
    .order('title', { ascending: true })
  if (error) {
    console.warn('[getAvailableCoursesForLevelMapping] failed:', error.message)
    return []
  }
  return (data ?? []) as Array<{ id: string; title: string; status: string }>
}

/**
 * シミュレーション一覧を取得する
 */
export async function getProjectSimulations(supabase: DB): Promise<ProjectSimulation[]> {
  const { data, error } = await (supabase as any)
    .from('project_simulations')
    .select('*')
    .order('updated_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

/**
 * シミュレーション詳細を取得する
 */
export async function getProjectSimulationDetail(
  supabase: DB,
  simulationId: string
): Promise<any | null> {
  // 親
  const { data: sim, error: simErr } = await (supabase as any)
    .from('project_simulations')
    .select('*')
    .eq('id', simulationId)
    .single()
  if (simErr) {
    console.warn('[getProjectSimulationDetail] parent select failed:', simErr.message)
    return null
  }

  // ポジション
  const { data: positions, error: posErr } = await (supabase as any)
    .from('simulation_positions')
    .select('*')
    .eq('simulation_id', simulationId)
    .order('sort_order', { ascending: true })
  if (posErr) throw posErr

  if (!positions || positions.length === 0) {
    return { ...sim, positions: [] }
  }

  const posIds = positions.map((p: any) => p.id)

  // ポジション要件
  const { data: requirements, error: reqErr } = await (supabase as any)
    .from('simulation_position_requirements')
    .select('*, requirement:skill_requirements(name)')
    .in('position_id', posIds)
  if (reqErr) throw reqErr

  // 仮アサインメンバー
  const { data: assignedMembers, error: memberErr } = await (supabase as any)
    .from('simulation_assigned_members')
    .select('*, employee:employees(id, name, employee_no, divisions(name))')
    .eq('simulation_id', simulationId)
  if (memberErr) throw memberErr

  const reqsByPos = new Map<string, any[]>()
  for (const req of requirements ?? []) {
    const list = reqsByPos.get(req.position_id) ?? []
    list.push({
      ...req,
      requirement_name: (req.requirement as any)?.name ?? '不明な要件'
    })
    reqsByPos.set(req.position_id, list)
  }

  const memberByPos = new Map<string, any>()
  for (const m of assignedMembers ?? []) {
    const emp = m.employee as any
    memberByPos.set(m.position_id, {
      employee_id: m.employee_id,
      full_name: emp?.name ?? null,
      employee_no: emp?.employee_no ?? null,
      division_name: emp?.divisions?.name ?? null
    })
  }

  const positionsWithDetails = positions.map((pos: any) => ({
    ...pos,
    requirements: reqsByPos.get(pos.id) ?? [],
    assignedMember: memberByPos.get(pos.id) ?? null
  }))

  return {
    ...sim,
    positions: positionsWithDetails
  }
}

export type MatchingEmployeeCandidate = {
  employee_id: string
  employee_no: string | null
  full_name: string | null
  division_name: string | null
  matching_score: number        // 適合率スコア (0-100)
  has_all_essential: boolean    // 必須条件をすべて満たしているか
  met_essential_count: number   // クリアした必須要件数
  total_essential_count: number // 必要な総必須要件数
  met_preferred_count: number   // クリアした歓迎要件数
  total_preferred_count: number // 必要な総歓迎要件数
  details: Array<{
    requirement_id: string
    requirement_name: string
    is_essential: boolean
    is_met: boolean
    weight: number
  }>
}

/**
 * 特定ポジションの求める「技能要件リスト」に合致する従業員を、適合スコア順に検索する
 */
export async function searchMatchingEmployees(
  supabase: DB,
  input: {
    requirements: Array<{ requirement_id: string; is_essential: boolean; weight: number }>
    targetDivisionId?: string // 特定部門内に絞る場合
  }
): Promise<MatchingEmployeeCandidate[]> {
  if (input.requirements.length === 0) return []

  // 1. 全てのアクティブな従業員情報を取得
  let empQuery = supabase
    .from('employees')
    .select('id, employee_no, name, division_id, divisions:divisions(name)')
    .eq('active_status', 'active')

  if (input.targetDivisionId && input.targetDivisionId !== 'all') {
    empQuery = empQuery.eq('division_id', input.targetDivisionId)
  }

  const { data: employees, error: empError } = await empQuery
  if (empError) throw empError
  if (!employees || employees.length === 0) return []

  const employeeIds = employees.map(e => e.id)
  const reqIds = input.requirements.map(r => r.requirement_id)

  // 2. 従業員がクリアしている技能要件（selections）を取得
  const { data: selections, error: selError } = await supabase
    .from('employee_skill_requirement_selections')
    .select('employee_id, requirement_id')
    .in('employee_id', employeeIds)
    .in('requirement_id', reqIds)

  if (selError) throw selError

  // 従業員ID → 保持している要件IDのSet マップ
  const selectionMap = new Map<string, Set<string>>()
  for (const sel of selections ?? []) {
    if (!selectionMap.has(sel.employee_id)) {
      selectionMap.set(sel.employee_id, new Set())
    }
    selectionMap.get(sel.employee_id)!.add(sel.requirement_id)
  }

  // 3. 要件マスタの詳細（要件名等）を取得
  const { data: reqMaster, error: reqMasterErr } = await supabase
    .from('skill_requirements')
    .select('id, name')
    .in('id', reqIds)

  if (reqMasterErr) throw reqMasterErr
  const reqNameMap = new Map(reqMaster?.map(r => [r.id, r.name]) ?? [])

  // 4. マッチングスコア算出
  const candidates: MatchingEmployeeCandidate[] = employees.map(emp => {
    const ownedReqs = selectionMap.get(emp.id) ?? new Set<string>()

    let totalWeight = 0
    let earnedWeight = 0
    let totalEssential = 0
    let metEssential = 0
    let totalPreferred = 0
    let metPreferred = 0

    const details = input.requirements.map(req => {
      const isMet = ownedReqs.has(req.requirement_id)
      const requirement_name = reqNameMap.get(req.requirement_id) ?? '不明な要件'
      
      const factor = req.is_essential ? 2 : 1
      const weightedVal = req.weight * factor
      totalWeight += weightedVal
      
      if (isMet) {
        earnedWeight += weightedVal
      }

      if (req.is_essential) {
        totalEssential++
        if (isMet) metEssential++
      } else {
        totalPreferred++
        if (isMet) metPreferred++
      }

      return {
        requirement_id: req.requirement_id,
        requirement_name,
        is_essential: req.is_essential,
        is_met: isMet,
        weight: req.weight
      }
    })

    const matching_score = totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 0
    const has_all_essential = metEssential === totalEssential

    return {
      employee_id: emp.id,
      employee_no: emp.employee_no,
      full_name: emp.name,
      division_name: (emp.divisions as any)?.name ?? null,
      matching_score,
      has_all_essential,
      met_essential_count: metEssential,
      total_essential_count: totalEssential,
      met_preferred_count: metPreferred,
      total_preferred_count: totalPreferred,
      details
    }
  })

  return candidates.sort((a, b) => {
    if (a.has_all_essential !== b.has_all_essential) {
      return a.has_all_essential ? -1 : 1
    }
    return b.matching_score - a.matching_score
  })
}

/**
 * 従業員のキャリア目標リストを取得する
 */
export async function getEmployeeCareerGoals(
  supabase: DB,
  employeeId: string
): Promise<EmployeeCareerGoal[]> {
  const { data, error } = await (supabase as any)
    .from('employee_career_goals')
    .select('*, skill:tenant_skills(name)')
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map((row: any) => ({
    ...row,
    skill_name: row.skill?.name ?? '不明な職種'
  }))
}

/**
 * 従業員のスキル達成履歴を取得する
 */
export async function getEmployeeSkillHistory(
  supabase: DB,
  employeeId: string
): Promise<EmployeeSkillRequirementHistory[]> {
  const { data, error } = await (supabase as any)
    .from('employee_skill_requirement_history')
    .select('*')
    .eq('employee_id', employeeId)
    .order('recorded_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

export type SkillBottleneckRow = {
  requirement_id: string
  requirement_name: string
  category: string | null
  level_name: string | null
  assigned_employee_count: number
  completed_employee_count: number
  uncompleted_employee_count: number
  completion_rate: number
}

/**
 * 部署内・職種内における、要件ごとの不足率を算出してボトルネック（未達成率の高いもの）をランキング
 */
export async function getSkillBottleneckAnalysis(
  supabase: DB,
  input: { divisionId?: string; skillId: string }
): Promise<SkillBottleneckRow[]> {
  let empQuery = supabase
    .from('employees')
    .select('id, division_id')
    .eq('active_status', 'active')
  
  if (input.divisionId && input.divisionId !== 'all') {
    empQuery = empQuery.eq('division_id', input.divisionId)
  }
  
  const { data: employees, error: empError } = await empQuery
  if (empError) throw empError
  if (!employees || employees.length === 0) return []
  
  const employeeIds = employees.map(e => e.id)

  const { data: assignments, error: assignError } = await supabase
    .from('employee_skill_assignments')
    .select('employee_id')
    .eq('skill_id', input.skillId)
    .in('employee_id', employeeIds)
    
  if (assignError) throw assignError
  if (!assignments || assignments.length === 0) return []
  
  const assignedEmployeeIds = assignments.map(a => a.employee_id)
  const totalAssignedCount = assignedEmployeeIds.length

  const { data: requirements, error: reqError } = await supabase
    .from('skill_requirements')
    .select('id, name, category, level:skill_levels(name)')
    .eq('skill_id', input.skillId)
    .order('sort_order', { ascending: true })
    
  if (reqError) throw reqError
  if (!requirements || requirements.length === 0) return []

  const { data: selections, error: selError } = await supabase
    .from('employee_skill_requirement_selections')
    .select('employee_id, requirement_id')
    .in('employee_id', assignedEmployeeIds)
    .in('requirement_id', requirements.map(r => r.id))
    
  if (selError) throw selError

  const completedCounts = new Map<string, number>()
  for (const sel of selections ?? []) {
    completedCounts.set(sel.requirement_id, (completedCounts.get(sel.requirement_id) ?? 0) + 1)
  }

  const rows: SkillBottleneckRow[] = requirements.map(req => {
    const completedCount = completedCounts.get(req.id) ?? 0
    const uncompletedCount = totalAssignedCount - completedCount
    const completionRate = totalAssignedCount > 0 
      ? Math.round((completedCount / totalAssignedCount) * 100) 
      : 0

    return {
      requirement_id: req.id,
      requirement_name: req.name,
      category: req.category,
      level_name: (req.level as any)?.name ?? null,
      assigned_employee_count: totalAssignedCount,
      completed_employee_count: completedCount,
      uncompleted_employee_count: uncompletedCount,
      completion_rate: completionRate
    }
  })

  return rows.sort((a, b) => a.completion_rate - b.completion_rate)
}

/**
 * 技能要件にマッピングされているeラーニングコースの一覧を取得
 */
export async function getMappedCoursesForRequirements(
  supabase: DB
): Promise<Array<{ course_id: string; course_title: string; requirement_id: string }>> {
  const { data, error } = await (supabase as any)
    .from('el_course_requirement_mappings')
    .select('requirement_id, course:el_courses(id, title)')
  if (error) {
    console.warn('[getMappedCoursesForRequirements] failed:', error.message)
    return []
  }
  return (data ?? [])
    .map((row: any) => ({
      requirement_id: row.requirement_id,
      course_id: row.course?.id || '',
      course_title: row.course?.title || '不明なコース'
    }))
    .filter(r => r.course_id !== '')
}



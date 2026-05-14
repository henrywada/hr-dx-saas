// src/features/skill-map/queries.ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import type {
  TenantSkill,
  SkillLevel,
  SkillRequirement,
  EmployeeSkillAssignment,
  EmployeeSkillRow,
  SkillGroupRow,
  EmployeeQualification,
  SkillMapDraft,
  SkillMatrixRow,
} from './types'

type DB = SupabaseClient<Database>

export async function getTenantSkills(supabase: DB): Promise<TenantSkill[]> {
  const { data, error } = await (supabase as any)
    .from('tenant_skills')
    .select('*')
    .order('sort_order', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function getSkillLevels(supabase: DB): Promise<SkillLevel[]> {
  const { data, error } = await (supabase as any)
    .from('skill_levels')
    .select('*')
    .order('sort_order', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function getSkillRequirements(
  supabase: DB,
  skillId: string
): Promise<SkillRequirement[]> {
  const { data, error } = await (supabase as any)
    .from('skill_requirements')
    .select('*, level:skill_levels(*)')
    .eq('skill_id', skillId)
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

// 現在有効な割り当て = employee_id × skill_id で started_at が最新の行
export async function getEmployeeSkillRows(
  supabase: DB,
  divisionId?: string
): Promise<EmployeeSkillRow[]> {
  let empQuery = (supabase as any)
    .from('employees')
    .select('id, employee_no, division_id, divisions:divisions(id, name)')
    .eq('active_status', 'active')
    .order('employee_no', { ascending: true })

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

  return (employees ?? []).map((emp: any) => {
    const current = currentMap[emp.id] ?? {}
    const startedAts = Object.values(current).map((a) => (a as EmployeeSkillAssignment).started_at)
    const latestStartedAt = startedAts.length > 0 ? startedAts.sort().reverse()[0] : null
    return {
      employee_id: emp.id,
      employee_name: emp.employee_no ?? emp.id,
      division_name: (emp.divisions as any)?.name ?? null,
      division_id: emp.division_id ?? null,
      currentAssignments: current,
      latestStartedAt,
    } as EmployeeSkillRow
  })
}

export async function getSkillGroupRows(supabase: DB): Promise<SkillGroupRow[]> {
  const skills = await getTenantSkills(supabase)

  const { data: assignments, error } = await (supabase as any)
    .from('employee_skill_assignments')
    .select('employee_id, skill_id, started_at, employees:employees(id, employee_no, divisions:divisions(name))')
    .order('started_at', { ascending: false })
  if (error) throw error

  const seen: Record<string, Set<string>> = {}
  const grouped: Record<string, Array<{ employee_id: string; employee_name: string; division_name: string | null; started_at: string }>> = {}

  for (const a of assignments ?? []) {
    if (!seen[a.skill_id]) seen[a.skill_id] = new Set()
    if (seen[a.skill_id].has(a.employee_id)) continue
    seen[a.skill_id].add(a.employee_id)
    if (!grouped[a.skill_id]) grouped[a.skill_id] = []
    const emp = a.employees as any
    grouped[a.skill_id].push({
      employee_id: a.employee_id,
      employee_name: emp?.employee_no ?? a.employee_id,
      division_name: emp?.divisions?.name ?? null,
      started_at: a.started_at,
    })
  }

  return skills.map((skill) => ({ skill, employees: grouped[skill.id] ?? [] }))
}

export async function getEmployeeQualifications(
  supabase: DB,
  employeeId: string
): Promise<EmployeeQualification[]> {
  const { data, error } = await (supabase as any)
    .from('employee_qualifications')
    .select('*, qualification:qualifications(*)')
    .eq('employee_id', employeeId)
    .order('expiry_date', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function getSkillMapDrafts(supabase: DB): Promise<SkillMapDraft[]> {
  const { data, error } = await (supabase as any)
    .from('skill_map_drafts')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function getSkillMapDraft(supabase: DB, draftId: string): Promise<SkillMapDraft | null> {
  const { data, error } = await (supabase as any)
    .from('skill_map_drafts')
    .select('*')
    .eq('id', draftId)
    .single()
  if (error) throw error
  return data
}

/** 配置シミュレーション用: 従業員ごとのスキル充足率を返す */
export async function getSkillMatrixRows(supabase: DB): Promise<SkillMatrixRow[]> {
  const { data: employees, error: empError } = await (supabase as any)
    .from('employees')
    .select('id, employee_no, division_id, divisions:divisions(name)')
    .eq('active_status', 'active')
    .order('employee_no', { ascending: true })
  if (empError) throw empError

  const { data: skills } = await (supabase as any).from('tenant_skills').select('id')
  const totalSkills = (skills ?? []).length

  const { data: assignments } = await (supabase as any)
    .from('employee_skill_assignments')
    .select('employee_id, skill_id')
    .in('employee_id', (employees ?? []).map((e: any) => e.id))

  const skillCountMap: Record<string, Set<string>> = {}
  for (const a of assignments ?? []) {
    if (!skillCountMap[a.employee_id]) skillCountMap[a.employee_id] = new Set()
    skillCountMap[a.employee_id].add(a.skill_id)
  }

  return (employees ?? []).map((emp: any) => ({
    employee_id: emp.id,
    employee_name: emp.employee_no ?? emp.id,
    division_name: (emp.divisions as any)?.name ?? null,
    division_id: emp.division_id ?? null,
    coverage: totalSkills > 0 ? Math.round(((skillCountMap[emp.id]?.size ?? 0) / totalSkills) * 100) : 0,
  }))
}

/** 期限30日以内の資格一覧を返す */
export async function getExpiringQualifications(supabase: DB): Promise<EmployeeQualification[]> {
  const today = new Date()
  const limit30 = new Date(today)
  limit30.setDate(limit30.getDate() + 30)
  const { data, error } = await (supabase as any)
    .from('employee_qualifications')
    .select('*, qualification:qualifications(*)')
    .lte('expiry_date', limit30.toISOString().split('T')[0])
    .gte('expiry_date', today.toISOString().split('T')[0])
    .order('expiry_date', { ascending: true })
  if (error) throw error
  return data ?? []
}

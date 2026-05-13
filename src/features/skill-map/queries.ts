import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import type {
  GlobalSkillTemplate,
  SkillCategory,
  Skill,
  SkillProficiencyDef,
  SkillMatrixRow,
  EmployeeQualification,
  SkillMapDraft,
} from './types'

type DB = SupabaseClient<Database>

/** グローバルテンプレート一覧（全テナント参照可） */
export async function getGlobalTemplates(supabase: DB): Promise<GlobalSkillTemplate[]> {
  const { data, error } = await supabase
    .from('global_skill_templates')
    .select('*')
    .eq('is_active', true)
    .order('industry_type')
  if (error) throw error
  return data ?? []
}

/** テナントのスキルカテゴリ一覧 */
export async function getSkillCategories(supabase: DB): Promise<SkillCategory[]> {
  const { data, error } = await supabase
    .from('skill_categories')
    .select('*')
    .order('sort_order')
  if (error) throw error
  return data ?? []
}

/** テナントのスキル一覧（カテゴリ付き） */
export async function getSkills(supabase: DB): Promise<Skill[]> {
  const { data, error } = await supabase
    .from('skills')
    .select('*, category:skill_categories(id, name, sort_order)')
    .order('sort_order')
  if (error) throw error
  return (data ?? []) as Skill[]
}

/** テナントの習熟度定義 */
export async function getProficiencyDefs(supabase: DB): Promise<SkillProficiencyDef[]> {
  const { data, error } = await supabase
    .from('skill_proficiency_defs')
    .select('*')
    .order('level', { ascending: false })
  if (error) throw error
  return data ?? []
}

/** スキルマトリクス用データ: 従業員×スキルの習熟度を結合 */
export async function getSkillMatrixRows(
  supabase: DB,
  divisionId?: string
): Promise<SkillMatrixRow[]> {
  let employeeQuery = supabase
    .from('employees')
    .select('id, name, job_title, division_id, divisions(name)')
    .eq('active_status', 'active')
  if (divisionId) {
    employeeQuery = employeeQuery.eq('division_id', divisionId)
  }
  const { data: employees, error: empError } = await employeeQuery
  if (empError) throw empError

  const skills = await getSkills(supabase)
  const employeeIds = (employees ?? []).map((e) => e.id)
  if (employeeIds.length === 0) return []

  const { data: empSkills, error: esError } = await supabase
    .from('employee_skills')
    .select('employee_id, skill_id, proficiency_level')
    .in('employee_id', employeeIds)
  if (esError) throw esError

  const skillMap: Record<string, Record<string, number>> = {}
  for (const es of empSkills ?? []) {
    if (!skillMap[es.employee_id]) skillMap[es.employee_id] = {}
    skillMap[es.employee_id][es.skill_id] = es.proficiency_level
  }

  return (employees ?? []).map((emp) => {
    const empSkillMap = skillMap[emp.id] ?? {}
    const evaluatedCount = Object.values(empSkillMap).filter((l) => l > 1).length
    const coverage = skills.length > 0 ? Math.round((evaluatedCount / skills.length) * 100) : 0
    return {
      employee_id: emp.id,
      employee_name: emp.name ?? '名前未設定',
      job_title: emp.job_title,
      division_name: (emp.divisions as { name: string } | null)?.name ?? null,
      skills: empSkillMap,
      coverage,
    }
  })
}

/** 従業員の保有資格一覧（資格マスタ付き） */
export async function getEmployeeQualifications(
  supabase: DB,
  employeeId: string
): Promise<EmployeeQualification[]> {
  const { data, error } = await supabase
    .from('employee_qualifications')
    .select('*, qualification:qualifications(*)')
    .eq('employee_id', employeeId)
    .order('expiry_date', { ascending: true, nullsFirst: false })
  if (error) throw error
  return (data ?? []) as EmployeeQualification[]
}

/** 期限30日以内の資格（テナント全従業員） */
export async function getExpiringQualifications(supabase: DB): Promise<EmployeeQualification[]> {
  const today = new Date().toISOString().split('T')[0]
  const thirtyDaysLater = new Date()
  thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30)
  const limit = thirtyDaysLater.toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('employee_qualifications')
    .select('*, qualification:qualifications(*)')
    .lte('expiry_date', limit)
    .gte('expiry_date', today)
  if (error) throw error
  return (data ?? []) as EmployeeQualification[]
}

/** 配置シミュレーション下書き一覧 */
export async function getSkillMapDrafts(supabase: DB): Promise<SkillMapDraft[]> {
  const { data, error } = await supabase
    .from('skill_map_drafts')
    .select('*')
    .order('updated_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

/** 配置シミュレーション下書き1件 */
export async function getSkillMapDraft(
  supabase: DB,
  draftId: string
): Promise<SkillMapDraft | null> {
  const { data, error } = await supabase
    .from('skill_map_drafts')
    .select('*')
    .eq('id', draftId)
    .single()
  if (error) throw error
  return data
}

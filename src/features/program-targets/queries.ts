import { createClient } from '@/lib/supabase/server'
import type {
  ProgramInstanceRow,
  ProgramTargetWithEmployee,
  EmployeeForTargetSelection,
} from './types'

// program_targets 等は型定義に含まれない場合があるため any でラップ
async function getSupabase() {
  return (await createClient()) as any
}

/** プログラム種別のラベル（re-export for Server 利用） */
export { PROGRAM_TYPE_LABELS } from './constants'

/** テナント内の実施枠一覧を取得（ストレスチェック・パルスサーベイ） */
export async function getProgramInstancesForAdmin(
  tenantId: string | null
): Promise<ProgramInstanceRow[]> {
  if (!tenantId) return []
  const supabase = await getSupabase()

  const results: ProgramInstanceRow[] = []

  // ストレスチェック期間
  const { data: scPeriods } = await supabase
    .from('stress_check_periods')
    .select('id, fiscal_year, title, start_date, end_date')
    .eq('tenant_id', tenantId)
    .order('fiscal_year', { ascending: false })

  for (const p of scPeriods ?? []) {
    const start = p.start_date ? new Date(p.start_date).toLocaleDateString('ja-JP') : ''
    const end = p.end_date ? new Date(p.end_date).toLocaleDateString('ja-JP') : ''
    const subLabel = start && end ? `${start} - ${end}` : undefined
    const targetCount = await getTargetCount(supabase, 'stress_check', p.id)
    results.push({
      programType: 'stress_check',
      instanceId: p.id,
      label: p.title || `${p.fiscal_year}年度ストレスチェック`,
      subLabel,
      targetCount,
    })
  }

  // パルスサーベイ期間
  const { data: psPeriods } = await supabase
    .from('pulse_survey_periods')
    .select('id, survey_period, title, deadline_date')
    .eq('tenant_id', tenantId)
    .order('survey_period', { ascending: false })

  for (const p of psPeriods ?? []) {
    const deadline = p.deadline_date
      ? new Date(p.deadline_date).toLocaleDateString('ja-JP')
      : undefined
    const targetCount = await getTargetCount(supabase, 'pulse_survey', p.id)
    results.push({
      programType: 'pulse_survey',
      instanceId: p.id,
      label: p.title || p.survey_period,
      subLabel: deadline ? `期限: ${deadline}` : undefined,
      targetCount,
    })
  }

  return results
}

async function getTargetCount(
  supabase: any,
  programType: string,
  instanceId: string
): Promise<number> {
  const { count } = await supabase
    .from('program_targets')
    .select('*', { count: 'exact', head: true })
    .eq('program_type', programType)
    .eq('program_instance_id', instanceId)
    .eq('is_eligible', true)
  return count ?? 0
}

/** 実施枠の表示名を取得 */
export async function getProgramInstanceLabel(
  programType: string,
  instanceId: string
): Promise<string> {
  const supabase = await getSupabase()
  if (programType === 'stress_check') {
    const { data } = await supabase
      .from('stress_check_periods')
      .select('title, fiscal_year')
      .eq('id', instanceId)
      .maybeSingle()
    if (!data) return 'ストレスチェック'
    return data.title || `${data.fiscal_year ?? ''}年度ストレスチェック`
  }
  if (programType === 'pulse_survey') {
    const { data } = await supabase
      .from('pulse_survey_periods')
      .select('title, survey_period')
      .eq('id', instanceId)
      .maybeSingle()
    if (!data) return 'パルスサーベイ'
    return data.title || data.survey_period || 'パルスサーベイ'
  }
  return '実施枠'
}

/** 対象者一覧を取得（従業員情報結合） */
export async function getProgramTargetsWithEmployees(
  programType: string,
  instanceId: string
): Promise<ProgramTargetWithEmployee[]> {
  const supabase = await getSupabase()
  const { data, error } = await supabase
    .from('program_targets')
    .select(
      `
      id,
      employee_id,
      is_eligible,
      exclusion_reason,
      employees (
        name,
        employee_no,
        divisions ( name )
      )
    `
    )
    .eq('program_type', programType)
    .eq('program_instance_id', instanceId)
    .order('created_at', { ascending: true })

  if (error || !data) return []

  return data.map((row: any) => {
    const emp = row.employees
    const div = emp?.divisions
    return {
      id: row.id,
      employee_id: row.employee_id,
      is_eligible: row.is_eligible,
      exclusion_reason: row.exclusion_reason,
      employee_name: emp?.name ?? null,
      employee_no: emp?.employee_no ?? null,
      division_name: (Array.isArray(div) ? div[0]?.name : div?.name) ?? null,
    } as ProgramTargetWithEmployee
  })
}

/** 対象者追加用の従業員一覧（company_doctor / test / developer 除外、未登録者のみ） */
export async function getEmployeesForTargetSelection(
  tenantId: string,
  programType: string,
  instanceId: string
): Promise<EmployeeForTargetSelection[]> {
  const supabase = await getSupabase()

  // 既に登録済みの employee_id を取得
  const { data: existing } = await supabase
    .from('program_targets')
    .select('employee_id')
    .eq('program_type', programType)
    .eq('program_instance_id', instanceId)
  const existingIds = new Set((existing ?? []).map((r: { employee_id: string }) => r.employee_id))

  // company_doctor, test, developer を除外した従業員一覧（app_role JOIN）
  const { data: employees, error } = await supabase
    .from('employees')
    .select(
      `
      id,
      name,
      employee_no,
      divisions ( name ),
      app_role:app_role_id ( app_role )
    `
    )
    .eq('tenant_id', tenantId)
    .order('employee_no', { ascending: true })

  if (error || !employees) return []

  const excludedRoles = new Set(['company_doctor', 'test', 'developer'])
  return employees
    .filter((e: any) => {
      const role = e.app_role?.app_role ?? (Array.isArray(e.app_role) ? e.app_role[0]?.app_role : null)
      return !excludedRoles.has(role)
    })
    .filter((e: any) => !existingIds.has(e.id))
    .map((e: any) => {
      const div = e.divisions
      return {
        id: e.id,
        name: e.name ?? null,
        employee_no: e.employee_no ?? null,
        division_name: (Array.isArray(div) ? div[0]?.name : div?.name) ?? null,
      } as EmployeeForTargetSelection
    })
}

import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  EvaluationTemplate,
  EvaluationTemplateItem,
  EvaluationTemplateWithItems,
  EvaluationPeriod,
  EvaluationSheet,
  EvaluationGoal,
  EvaluationScore,
} from './types'

/** テナント評価テンプレート一覧 */
export async function getEvaluationTemplates(
  supabase: SupabaseClient,
  tenantId: string
): Promise<EvaluationTemplate[]> {
  const { data, error } = await (supabase as any)
    .from('evaluation_templates')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('sort_order')
    .order('created_at')
  if (error) {
    console.warn('[getEvaluationTemplates] failed:', error.message)
    return []
  }
  return (data ?? []) as EvaluationTemplate[]
}

/** テナント評価テンプレート詳細（項目ネスト） */
export async function getEvaluationTemplateWithItems(
  supabase: SupabaseClient,
  templateId: string
): Promise<EvaluationTemplateWithItems | null> {
  const { data: tpl, error: tplErr } = await (supabase as any)
    .from('evaluation_templates')
    .select('*')
    .eq('id', templateId)
    .maybeSingle()
  if (tplErr || !tpl) return null

  const { data: items, error: itemErr } = await (supabase as any)
    .from('evaluation_template_items')
    .select('*')
    .eq('template_id', templateId)
    .order('sort_order')
    .order('created_at')
  if (itemErr) {
    console.warn('[getEvaluationTemplateWithItems] items failed:', itemErr.message)
  }

  return {
    ...(tpl as EvaluationTemplate),
    items: (items ?? []) as EvaluationTemplateItem[],
  }
}

/** 評価期間一覧 */
export async function getEvaluationPeriods(
  supabase: SupabaseClient,
  tenantId: string
): Promise<EvaluationPeriod[]> {
  const { data, error } = await (supabase as any)
    .from('evaluation_periods')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('fiscal_year', { ascending: false })
    .order('start_date', { ascending: false })
  if (error) {
    console.warn('[getEvaluationPeriods] failed:', error.message)
    return []
  }
  return (data ?? []) as EvaluationPeriod[]
}

/** 評価シート一覧（テナント管理者用 — 全従業員） */
export async function getEvaluationSheets(
  supabase: SupabaseClient,
  tenantId: string,
  periodId?: string
): Promise<EvaluationSheet[]> {
  let query = (supabase as any)
    .from('evaluation_sheets')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  if (periodId) {
    query = query.eq('period_id', periodId)
  }

  const { data, error } = await query
  if (error) {
    console.warn('[getEvaluationSheets] failed:', error.message)
    return []
  }
  return (data ?? []) as EvaluationSheet[]
}

/** 評価シート詳細 */
export async function getEvaluationSheet(
  supabase: SupabaseClient,
  sheetId: string
): Promise<EvaluationSheet | null> {
  const { data, error } = await (supabase as any)
    .from('evaluation_sheets')
    .select('*')
    .eq('id', sheetId)
    .maybeSingle()
  if (error || !data) return null
  return data as EvaluationSheet
}

/** 従業員の評価シート一覧（自己評価用） */
export async function getMyEvaluationSheets(
  supabase: SupabaseClient,
  employeeId: string
): Promise<EvaluationSheet[]> {
  const { data, error } = await (supabase as any)
    .from('evaluation_sheets')
    .select('*')
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: false })
  if (error) {
    console.warn('[getMyEvaluationSheets] failed:', error.message)
    return []
  }
  return (data ?? []) as EvaluationSheet[]
}

/** 評価シートの目標一覧 */
export async function getEvaluationGoals(
  supabase: SupabaseClient,
  sheetId: string
): Promise<EvaluationGoal[]> {
  const { data, error } = await (supabase as any)
    .from('evaluation_goals')
    .select('*')
    .eq('sheet_id', sheetId)
    .order('sort_order')
    .order('created_at')
  if (error) {
    console.warn('[getEvaluationGoals] failed:', error.message)
    return []
  }
  return (data ?? []) as EvaluationGoal[]
}

/** テナントの従業員一覧（評価シート生成用） */
export async function getEmployeesForEvaluation(
  supabase: SupabaseClient,
  tenantId: string
): Promise<
  { id: string; full_name: string; employee_code: string | null; division_path: string | null }[]
> {
  const { data, error } = await (supabase as any)
    .from('employees')
    .select('id, name, employee_no, division:division_id(name, parent:parent_id(name))')
    .eq('tenant_id', tenantId)
    .neq('active_status', 'inactive')
    .order('employee_no')
  if (error) {
    console.warn('[getEmployeesForEvaluation] failed:', error.message)
    return []
  }
  type Raw = {
    id: string
    name: string | null
    employee_no: string | null
    division: { name: string | null; parent: { name: string | null } | null } | null
  }
  return ((data ?? []) as Raw[]).map(e => {
    const divName = e.division?.name ?? null
    const parentName = e.division?.parent?.name ?? null
    const division_path = parentName && divName ? `${parentName} / ${divName}` : (divName ?? null)
    return {
      id: e.id,
      full_name: e.name ?? '',
      employee_code: e.employee_no,
      division_path,
    }
  })
}

/** 従業員IDのリストから 表示名のマップ を取得する（評価者・対象者名の解決用） */
export async function getEmployeeNamesByIds(
  supabase: SupabaseClient,
  tenantId: string,
  ids: string[]
): Promise<Record<string, string>> {
  const uniqueIds = [...new Set(ids.filter(Boolean))]
  if (uniqueIds.length === 0) return {}
  const { data, error } = await (supabase as any)
    .from('employees')
    .select('id, name')
    .eq('tenant_id', tenantId)
    .in('id', uniqueIds)
  if (error || !data) return {}
  const map: Record<string, string> = {}
  for (const e of data as { id: string; name: string | null }[]) {
    map[e.id] = e.name ?? ''
  }
  return map
}

/** 評価スコア一覧（シート内の全評価タイプ） */
export async function getEvaluationScores(
  supabase: SupabaseClient,
  sheetId: string
): Promise<EvaluationScore[]> {
  const { data, error } = await (supabase as any)
    .from('evaluation_scores')
    .select('*')
    .eq('sheet_id', sheetId)
  if (error) {
    console.warn('[getEvaluationScores] failed:', error.message)
    return []
  }
  return (data ?? []) as EvaluationScore[]
}

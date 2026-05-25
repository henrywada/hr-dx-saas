'use server'

import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { revalidatePath } from 'next/cache'
import { APP_ROUTES } from '@/config/routes'
import type { EvaluationAxis, MboCategory, PeriodType, FlowStatus, EvalActionResult } from './types'

// ---- テナントテンプレート ----

/** グローバルテンプレートからテナントテンプレートをコピー */
export async function copyFromGlobalTemplate(
  globalTemplateId: string
): Promise<{ success: boolean; templateId?: string; error?: string }> {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false, error: '権限がありません' }

  const supabase = await createClient()

  const { data: globalTpl } = await (supabase as any)
    .from('global_evaluation_templates')
    .select('*, global_evaluation_template_items(*)')
    .eq('id', globalTemplateId)
    .single()
  if (!globalTpl) return { success: false, error: 'テンプレートが見つかりません' }

  const { data: newTpl, error: tplErr } = await (supabase as any)
    .from('evaluation_templates')
    .insert({
      tenant_id: user.tenant_id,
      global_template_id: globalTpl.id,
      name: globalTpl.name,
      template_type: globalTpl.template_type,
      description: globalTpl.description,
      copied_from_global_at: new Date().toISOString(),
      created_by: user.id,
    })
    .select('id')
    .single()
  if (tplErr || !newTpl) return { success: false, error: tplErr?.message }

  const items = (globalTpl.global_evaluation_template_items ?? []).map((item: any) => ({
    tenant_id: user.tenant_id,
    template_id: newTpl.id,
    axis: item.axis,
    mbo_category: item.mbo_category,
    name: item.name,
    description: item.description,
    evaluation_focus: item.evaluation_focus ?? null,
    measurement_method: item.measurement_method ?? null,
    target_grade_note: item.target_grade_note ?? null,
    weight: item.weight,
    sort_order: item.sort_order,
    is_custom: false,
  }))

  if (items.length > 0) {
    const { error: itemErr } = await (supabase as any)
      .from('evaluation_template_items')
      .insert(items)
    if (itemErr) return { success: false, error: itemErr.message }
  }

  revalidatePath(APP_ROUTES.EVALUATION.ADMIN_TEMPLATES)
  return { success: true, templateId: newTpl.id }
}

/** テナントテンプレートを更新 */
export async function updateEvaluationTemplate(input: {
  id: string
  name?: string
  description?: string | null
  is_active?: boolean
}): Promise<EvalActionResult> {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false, error: '権限がありません' }
  const supabase = await createClient()
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (input.name !== undefined) updates.name = input.name.trim()
  if ('description' in input) updates.description = input.description?.trim() || null
  if (input.is_active !== undefined) updates.is_active = input.is_active
  const { error } = await (supabase as any)
    .from('evaluation_templates')
    .update(updates)
    .eq('id', input.id)
    .eq('tenant_id', user.tenant_id)
  if (error) return { success: false, error: error.message }
  revalidatePath(APP_ROUTES.EVALUATION.ADMIN_TEMPLATES)
  return { success: true }
}

/** テナントテンプレートを削除 */
export async function deleteEvaluationTemplate(input: { id: string }): Promise<EvalActionResult> {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false, error: '権限がありません' }
  const supabase = await createClient()
  const { error } = await (supabase as any)
    .from('evaluation_templates')
    .delete()
    .eq('id', input.id)
    .eq('tenant_id', user.tenant_id)
  if (error) return { success: false, error: error.message }
  revalidatePath(APP_ROUTES.EVALUATION.ADMIN_TEMPLATES)
  return { success: true }
}

/** テナント評価項目を更新 */
export async function updateEvaluationTemplateItem(input: {
  id: string
  template_id: string
  name?: string
  description?: string | null
  evaluation_focus?: string | null
  measurement_method?: string | null
  target_grade_note?: string | null
  weight?: number
}): Promise<EvalActionResult> {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false, error: '権限がありません' }
  const supabase = await createClient()
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (input.name !== undefined) updates.name = input.name.trim()
  if ('description' in input) updates.description = input.description?.trim() || null
  if ('evaluation_focus' in input) updates.evaluation_focus = input.evaluation_focus?.trim() || null
  if ('measurement_method' in input)
    updates.measurement_method = input.measurement_method?.trim() || null
  if ('target_grade_note' in input)
    updates.target_grade_note = input.target_grade_note?.trim() || null
  if (input.weight !== undefined) updates.weight = input.weight
  const { error } = await (supabase as any)
    .from('evaluation_template_items')
    .update(updates)
    .eq('id', input.id)
    .eq('tenant_id', user.tenant_id)
  if (error) return { success: false, error: error.message }
  revalidatePath(APP_ROUTES.EVALUATION.ADMIN_TEMPLATE_DETAIL(input.template_id))
  return { success: true }
}

/** テナント評価項目を削除 */
export async function deleteEvaluationTemplateItem(input: {
  id: string
  template_id: string
}): Promise<EvalActionResult> {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false, error: '権限がありません' }
  const supabase = await createClient()
  const { error } = await (supabase as any)
    .from('evaluation_template_items')
    .delete()
    .eq('id', input.id)
    .eq('tenant_id', user.tenant_id)
  if (error) return { success: false, error: error.message }
  revalidatePath(APP_ROUTES.EVALUATION.ADMIN_TEMPLATE_DETAIL(input.template_id))
  return { success: true }
}

/** テナント評価項目を追加（カスタム項目） */
export async function addCustomEvaluationItem(input: {
  template_id: string
  axis: EvaluationAxis
  mbo_category?: MboCategory | null
  name: string
  description?: string
  weight?: number
}): Promise<EvalActionResult> {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false, error: '権限がありません' }
  const supabase = await createClient()

  const { data: tpl } = await (supabase as any)
    .from('evaluation_templates')
    .select('id')
    .eq('id', input.template_id)
    .eq('tenant_id', user.tenant_id)
    .maybeSingle()
  if (!tpl) return { success: false, error: 'テンプレートが見つかりません' }

  const { error } = await (supabase as any).from('evaluation_template_items').insert({
    tenant_id: user.tenant_id,
    template_id: input.template_id,
    axis: input.axis,
    mbo_category: input.mbo_category ?? null,
    name: input.name.trim(),
    description: input.description?.trim() || null,
    weight: input.weight ?? 0,
    is_custom: true,
    sort_order: 999,
  })
  if (error) return { success: false, error: error.message }
  revalidatePath(APP_ROUTES.EVALUATION.ADMIN_TEMPLATE_DETAIL(input.template_id))
  return { success: true }
}

// ---- 評価期間 ----

/** 評価期間を作成 */
export async function createEvaluationPeriod(input: {
  name: string
  fiscal_year: number
  period_type: PeriodType
  start_date: string
  end_date: string
  goal_deadline?: string
  self_eval_start?: string
  self_eval_end?: string
  primary_eval_end?: string
  secondary_eval_end?: string
}): Promise<EvalActionResult> {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false, error: '権限がありません' }
  const supabase = await createClient()
  const { error } = await (supabase as any).from('evaluation_periods').insert({
    tenant_id: user.tenant_id,
    name: input.name.trim(),
    fiscal_year: input.fiscal_year,
    period_type: input.period_type,
    start_date: input.start_date,
    end_date: input.end_date,
    goal_deadline: input.goal_deadline ?? null,
    self_eval_start: input.self_eval_start ?? null,
    self_eval_end: input.self_eval_end ?? null,
    primary_eval_end: input.primary_eval_end ?? null,
    secondary_eval_end: input.secondary_eval_end ?? null,
    status: 'preparation',
  })
  if (error) return { success: false, error: error.message }
  revalidatePath(APP_ROUTES.EVALUATION.ADMIN_PERIODS)
  return { success: true }
}

/** 評価期間のステータスを更新 */
export async function updateEvaluationPeriodStatus(input: {
  id: string
  status: string
}): Promise<EvalActionResult> {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false, error: '権限がありません' }
  const supabase = await createClient()
  const { error } = await (supabase as any)
    .from('evaluation_periods')
    .update({ status: input.status, updated_at: new Date().toISOString() })
    .eq('id', input.id)
    .eq('tenant_id', user.tenant_id)
  if (error) return { success: false, error: error.message }
  revalidatePath(APP_ROUTES.EVALUATION.ADMIN_PERIODS)
  return { success: true }
}

// ---- 評価シート ----

/** 評価シートを一括生成（期間 × 対象従業員） */
export async function createEvaluationSheets(input: {
  period_id: string
  template_id: string
  employee_ids: string[]
}): Promise<EvalActionResult> {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false, error: '権限がありません' }
  const supabase = await createClient()

  // 各従業員の評価者を employee_approvers からスナップショット取得
  const sheets = await Promise.all(
    input.employee_ids.map(async employeeId => {
      const { data: approvers } = await (supabase as any)
        .from('employee_approvers')
        .select('approver_id, approver_role')
        .eq('tenant_id', user.tenant_id)
        .eq('employee_id', employeeId)
        .in('approver_role', ['eval_primary', 'eval_secondary', 'eval_confirmer'])

      const approverMap: Record<string, string> = {}
      for (const row of (approvers ?? []) as { approver_id: string; approver_role: string }[]) {
        approverMap[row.approver_role] = row.approver_id
      }

      return {
        tenant_id: user.tenant_id,
        employee_id: employeeId,
        period_id: input.period_id,
        template_id: input.template_id,
        primary_evaluator_id: approverMap['eval_primary'] ?? null,
        secondary_evaluator_id: approverMap['eval_secondary'] ?? null,
        confirmer_id: approverMap['eval_confirmer'] ?? null,
        flow_status: 'draft',
      }
    })
  )

  const { error } = await (supabase as any)
    .from('evaluation_sheets')
    .upsert(sheets, { onConflict: 'employee_id,period_id', ignoreDuplicates: true })
  if (error) return { success: false, error: error.message }

  revalidatePath(APP_ROUTES.EVALUATION.ADMIN_LIST)
  return { success: true }
}

/** フロー状態を進める */
export async function advanceEvaluationFlow(input: {
  sheet_id: string
  to_status: FlowStatus
  comment?: string
}): Promise<EvalActionResult> {
  const user = await getServerUser()
  if (!user?.tenant_id || !user.employee_id) return { success: false, error: '権限がありません' }
  const supabase = await createClient()

  const { data: sheet } = await (supabase as any)
    .from('evaluation_sheets')
    .select('flow_status, is_locked')
    .eq('id', input.sheet_id)
    .eq('tenant_id', user.tenant_id)
    .maybeSingle()
  if (!sheet) return { success: false, error: '評価シートが見つかりません' }
  if (sheet.is_locked) return { success: false, error: '確定済みのシートは変更できません' }

  const isLocked = input.to_status === 'confirmed'

  const { error: updateErr } = await (supabase as any)
    .from('evaluation_sheets')
    .update({
      flow_status: input.to_status,
      is_locked: isLocked,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.sheet_id)
  if (updateErr) return { success: false, error: updateErr.message }

  await (supabase as any).from('evaluation_flow_logs').insert({
    tenant_id: user.tenant_id,
    sheet_id: input.sheet_id,
    from_status: sheet.flow_status,
    to_status: input.to_status,
    changed_by: user.employee_id,
    comment: input.comment ?? null,
  })

  revalidatePath(APP_ROUTES.EVALUATION.ADMIN_SHEET(input.sheet_id))
  revalidatePath(APP_ROUTES.EVALUATION.MY_EVALUATION_SHEET(input.sheet_id))
  return { success: true }
}

// ---- MBO目標 ----

/** MBO目標を追加 */
export async function createEvaluationGoal(input: {
  sheet_id: string
  goal_title: string
  goal_detail?: string
  kpi_type: 'quantitative' | 'qualitative'
  kpi_target?: string
  kpi_unit?: string
  kpi_achieve_criteria?: string
  weight?: number
  deadline?: string
}): Promise<EvalActionResult> {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false, error: '権限がありません' }
  const supabase = await createClient()
  const { error } = await (supabase as any).from('evaluation_goals').insert({
    tenant_id: user.tenant_id,
    sheet_id: input.sheet_id,
    goal_title: input.goal_title.trim(),
    goal_detail: input.goal_detail?.trim() || null,
    kpi_type: input.kpi_type,
    kpi_target: input.kpi_target?.trim() || null,
    kpi_unit: input.kpi_unit?.trim() || null,
    kpi_achieve_criteria: input.kpi_achieve_criteria?.trim() || null,
    weight: input.weight ?? 0,
    deadline: input.deadline ?? null,
    sort_order: 0,
  })
  if (error) return { success: false, error: error.message }
  revalidatePath(APP_ROUTES.EVALUATION.MY_EVALUATION_SHEET(input.sheet_id))
  return { success: true }
}

// ---- 評価スコア ----

/** 評価スコアを保存（upsert） */
export async function saveEvaluationScore(input: {
  sheet_id: string
  item_id?: string
  goal_id?: string
  evaluator_type: 'self' | 'primary' | 'secondary' | 'confirmer'
  score?: number
  achievement_rate?: number
  comment?: string
}): Promise<EvalActionResult> {
  const user = await getServerUser()
  if (!user?.tenant_id || !user.employee_id) return { success: false, error: '権限がありません' }
  const supabase = await createClient()

  let existingQuery = (supabase as any)
    .from('evaluation_scores')
    .select('id')
    .eq('sheet_id', input.sheet_id)
    .eq('evaluator_type', input.evaluator_type)
    .eq('evaluator_id', user.employee_id)

  if (input.item_id) {
    existingQuery = existingQuery.eq('item_id', input.item_id)
  } else if (input.goal_id) {
    existingQuery = existingQuery.eq('goal_id', input.goal_id)
  }

  const { data: existing } = await existingQuery.maybeSingle()

  const scoreData = {
    tenant_id: user.tenant_id,
    sheet_id: input.sheet_id,
    item_id: input.item_id ?? null,
    goal_id: input.goal_id ?? null,
    evaluator_type: input.evaluator_type,
    score: input.score ?? null,
    achievement_rate: input.achievement_rate ?? null,
    comment: input.comment?.trim() || null,
    evaluated_at: new Date().toISOString(),
    evaluator_id: user.employee_id,
  }

  if (existing?.id) {
    const { error } = await (supabase as any)
      .from('evaluation_scores')
      .update(scoreData)
      .eq('id', existing.id)
    if (error) return { success: false, error: error.message }
  } else {
    const { error } = await (supabase as any).from('evaluation_scores').insert(scoreData)
    if (error) return { success: false, error: error.message }
  }

  revalidatePath(APP_ROUTES.EVALUATION.MY_EVALUATION_SHEET(input.sheet_id))
  revalidatePath(APP_ROUTES.EVALUATION.ADMIN_SHEET(input.sheet_id))
  return { success: true }
}

/** 評価シートを削除 */
export async function deleteEvaluationSheet(input: { id: string }): Promise<EvalActionResult> {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false, error: '権限がありません' }
  const supabase = await createClient()
  const { error } = await (supabase as any)
    .from('evaluation_sheets')
    .delete()
    .eq('id', input.id)
    .eq('tenant_id', user.tenant_id)
  if (error) return { success: false, error: error.message }
  revalidatePath(APP_ROUTES.EVALUATION.ADMIN_LIST)
  return { success: true }
}

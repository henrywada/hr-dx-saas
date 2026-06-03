import type { SupabaseClient } from '@supabase/supabase-js'
import { differenceInCalendarDays, parseISO } from 'date-fns'
import type { EvaluationPeriod, FlowStatus } from './types'
import type { PhaseCount, PendingEmployee, ReminderRecord } from './workflow-types'

/** フロー状態ごとのカラー設定 */
const PHASE_COLORS: Record<string, string> = {
  draft:               '#9ca3af',
  goal_set:            '#60a5fa',
  self_eval:           '#a78bfa',
  self_submitted:      '#7c3aed',
  primary_eval:        '#fbbf24',
  primary_submitted:   '#d97706',
  secondary_eval:      '#fb923c',
  secondary_submitted: '#ea580c',
  confirming:          '#818cf8',
  confirmed:           '#34d399',
}

const FLOW_STATUS_LABELS: Record<string, string> = {
  draft:               '下書き',
  goal_set:            '目標設定完了',
  self_eval:           '自己評価中',
  self_submitted:      '自己評価済',
  primary_eval:        '一次評価中',
  primary_submitted:   '一次評価済',
  secondary_eval:      '二次評価中',
  secondary_submitted: '二次評価済',
  confirming:          '確定者確認中',
  confirmed:           '確定',
}

/** フロー状態からフェーズ期限日を取得する */
function getPhaseDeadline(status: FlowStatus, period: EvaluationPeriod): string | null {
  switch (status) {
    case 'draft':
    case 'goal_set':
      return period.goal_deadline
    case 'self_eval':
    case 'self_submitted':
      return period.self_eval_end
    case 'primary_eval':
    case 'primary_submitted':
      return period.primary_eval_end
    case 'secondary_eval':
    case 'secondary_submitted':
      return period.secondary_eval_end
    default:
      return null
  }
}

/** 指定期間のフェーズ別件数を集計する */
export async function getWorkflowPhaseCounts(
  supabase: SupabaseClient,
  tenantId: string,
  periodId: string
): Promise<PhaseCount[]> {
  const { data, error } = await (supabase as any)
    .from('evaluation_sheets')
    .select('flow_status')
    .eq('tenant_id', tenantId)
    .eq('period_id', periodId)

  if (error) {
    console.warn('[getWorkflowPhaseCounts] failed:', error.message)
    return []
  }

  const countMap: Record<string, number> = {}
  for (const row of (data ?? []) as { flow_status: string }[]) {
    countMap[row.flow_status] = (countMap[row.flow_status] ?? 0) + 1
  }

  const order: FlowStatus[] = [
    'draft', 'goal_set', 'self_eval', 'self_submitted',
    'primary_eval', 'primary_submitted', 'secondary_eval',
    'secondary_submitted', 'confirming', 'confirmed',
  ]

  return order
    .filter(s => (countMap[s] ?? 0) > 0)
    .map(s => ({
      status: s,
      count: countMap[s] ?? 0,
      label: FLOW_STATUS_LABELS[s] ?? s,
      color: PHASE_COLORS[s] ?? '#9ca3af',
    }))
}

/** 未提出者（confirmed 以外）の一覧を取得する */
export async function getPendingEmployees(
  supabase: SupabaseClient,
  tenantId: string,
  periodId: string,
  period: EvaluationPeriod
): Promise<PendingEmployee[]> {
  const { data: sheets, error } = await (supabase as any)
    .from('evaluation_sheets')
    .select(`
      id,
      employee_id,
      flow_status,
      employees!employee_id (
        name,
        employee_no,
        division:division_id (
          name,
          parent:parent_id ( name )
        )
      )
    `)
    .eq('tenant_id', tenantId)
    .eq('period_id', periodId)
    .neq('flow_status', 'confirmed')
    .order('flow_status')

  if (error) {
    console.warn('[getPendingEmployees] failed:', error.message)
    return []
  }

  // 最後のリマインダー日時を sheet_id ごとに取得
  const sheetIds = (sheets ?? []).map((s: any) => s.id)
  const reminderMap: Record<string, string> = {}

  if (sheetIds.length > 0) {
    const { data: reminders } = await (supabase as any)
      .from('evaluation_reminders')
      .select('sheet_id, sent_at')
      .eq('tenant_id', tenantId)
      .in('sheet_id', sheetIds)
      .order('sent_at', { ascending: false })

    for (const r of (reminders ?? []) as { sheet_id: string; sent_at: string }[]) {
      if (!reminderMap[r.sheet_id]) {
        reminderMap[r.sheet_id] = r.sent_at
      }
    }
  }

  const today = new Date()

  return (sheets ?? []).map((s: any) => {
    const emp = s.employees
    const divName = emp?.division?.name ?? null
    const parentName = emp?.division?.parent?.name ?? null
    const division_path =
      parentName && divName ? `${parentName} / ${divName}` : (divName ?? null)

    const phaseDeadline = getPhaseDeadline(s.flow_status as FlowStatus, period)
    const days_remaining = phaseDeadline
      ? differenceInCalendarDays(parseISO(phaseDeadline), today)
      : null

    return {
      sheet_id: s.id,
      employee_id: s.employee_id,
      employee_name: emp?.name ?? s.employee_id,
      employee_code: emp?.employee_no ?? null,
      division_path,
      flow_status: s.flow_status as FlowStatus,
      phase_deadline: phaseDeadline,
      days_remaining,
      last_reminder_at: reminderMap[s.id] ?? null,
    } satisfies PendingEmployee
  })
}

/** リマインダー履歴を取得する（最新50件） */
export async function getReminderHistory(
  supabase: SupabaseClient,
  tenantId: string,
  periodId: string
): Promise<ReminderRecord[]> {
  const { data, error } = await (supabase as any)
    .from('evaluation_reminders')
    .select(`
      id,
      sheet_id,
      reminder_type,
      message,
      target_status,
      sent_at,
      sent_by_employee:sent_by ( name )
    `)
    .eq('tenant_id', tenantId)
    .eq('period_id', periodId)
    .order('sent_at', { ascending: false })
    .limit(50)

  if (error) {
    console.warn('[getReminderHistory] failed:', error.message)
    return []
  }

  // 対象シートの従業員名を取得
  const sheetIds = [...new Set((data ?? []).map((r: any) => r.sheet_id))]
  const empMap: Record<string, string> = {}

  if (sheetIds.length > 0) {
    const { data: sheets } = await (supabase as any)
      .from('evaluation_sheets')
      .select('id, employees!employee_id ( name )')
      .in('id', sheetIds)

    for (const s of (sheets ?? []) as any[]) {
      empMap[s.id] = s.employees?.name ?? s.id
    }
  }

  return (data ?? []).map((r: any) => ({
    id: r.id,
    sheet_id: r.sheet_id,
    employee_name: empMap[r.sheet_id] ?? r.sheet_id,
    reminder_type: r.reminder_type,
    message: r.message ?? null,
    target_status: r.target_status ?? null,
    sent_by_name: r.sent_by_employee?.name ?? '不明',
    sent_at: r.sent_at,
  } satisfies ReminderRecord))
}

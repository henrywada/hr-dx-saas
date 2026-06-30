'use server'

import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { revalidatePath } from 'next/cache'
import { APP_ROUTES } from '@/config/routes'
import type { EvalActionResult, FlowStatus } from './types'
import {
  getEvaluationReminderRecipientId,
  trySendEvaluationReminderEmail,
} from './evaluation-reminder-mail'

type SheetRow = {
  id: string
  employee_id: string
  flow_status: FlowStatus
  primary_evaluator_id: string | null
  secondary_evaluator_id: string | null
  confirmer_id: string | null
  employees?: { name: string | null } | null
}

async function loadSheetForReminder(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string,
  sheetId: string,
): Promise<SheetRow | null> {
  const { data } = await (supabase as any)
    .from('evaluation_sheets')
    .select(
      'id, employee_id, flow_status, primary_evaluator_id, secondary_evaluator_id, confirmer_id, employees!employee_id ( name )',
    )
    .eq('id', sheetId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  return (data as SheetRow | null) ?? null
}

async function loadPeriodName(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string,
  periodId: string,
): Promise<string> {
  const { data } = await (supabase as any)
    .from('evaluation_periods')
    .select('name')
    .eq('id', periodId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  return (data?.name as string | undefined) ?? '評価期間'
}

async function loadEmployeeName(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string,
  employeeId: string,
): Promise<string> {
  const { data } = await supabase
    .from('employees')
    .select('name')
    .eq('id', employeeId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  return data?.name ?? '担当者'
}

/** 単一シートへリマインダーを送信する（ログ記録 + メール送信 EV-C1） */
export async function sendReminder(input: {
  period_id: string
  sheet_id: string
  reminder_type: 'deadline_approaching' | 'overdue' | 'bulk_nudge' | 'rollback_notify'
  message?: string
  target_status?: string
}): Promise<EvalActionResult & { email_sent?: boolean }> {
  const user = await getServerUser()
  if (!user?.tenant_id || !user.employee_id) return { success: false, error: '権限がありません' }

  const supabase = await createClient()
  const sheet = await loadSheetForReminder(supabase, user.tenant_id, input.sheet_id)
  if (!sheet) return { success: false, error: '評価シートが見つかりません' }

  const flowStatus = (input.target_status ?? sheet.flow_status) as FlowStatus
  const periodName = await loadPeriodName(supabase, user.tenant_id, input.period_id)
  const recipientId = getEvaluationReminderRecipientId({ ...sheet, flow_status: flowStatus })
  const recipientName = await loadEmployeeName(supabase, user.tenant_id, recipientId)

  const mailResult = await trySendEvaluationReminderEmail({
    tenantId: user.tenant_id,
    recipientEmployeeId: recipientId,
    recipientName,
    periodName,
    flowStatus,
    message: input.message,
    isOverdue: input.reminder_type === 'overdue',
  })

  const { error } = await (supabase as any).from('evaluation_reminders').insert({
    tenant_id: user.tenant_id,
    period_id: input.period_id,
    sheet_id: input.sheet_id,
    sent_by: user.employee_id,
    reminder_type: input.reminder_type,
    message: input.message?.trim() || null,
    target_status: flowStatus,
    email_sent: mailResult.emailSent,
    email_error: mailResult.emailError,
  })

  if (error) return { success: false, error: error.message }

  revalidatePath(APP_ROUTES.EVALUATION.WORKFLOW)
  return { success: true, email_sent: mailResult.emailSent }
}

/** 複数シートへ一括リマインダーを送信する */
export async function sendBulkReminder(input: {
  period_id: string
  sheet_ids: string[]
  message?: string
}): Promise<{ success: boolean; sent_count: number; email_sent_count?: number; error?: string }> {
  const user = await getServerUser()
  if (!user?.tenant_id || !user.employee_id) {
    return { success: false, sent_count: 0, error: '権限がありません' }
  }
  if (input.sheet_ids.length === 0) {
    return { success: false, sent_count: 0, error: '対象シートがありません' }
  }
  if (input.sheet_ids.length > 200) {
    return { success: false, sent_count: 0, error: '一括催促は200件以内にしてください' }
  }

  const supabase = await createClient()
  const periodName = await loadPeriodName(supabase, user.tenant_id, input.period_id)

  const { data: sheets } = await (supabase as any)
    .from('evaluation_sheets')
    .select(
      'id, employee_id, flow_status, primary_evaluator_id, secondary_evaluator_id, confirmer_id',
    )
    .eq('tenant_id', user.tenant_id)
    .eq('period_id', input.period_id)
    .in('id', input.sheet_ids)

  const validSheets = (sheets ?? []) as Omit<SheetRow, 'employees'>[]
  if (validSheets.length === 0) {
    return { success: false, sent_count: 0, error: '有効なシートがありません' }
  }

  let emailSentCount = 0
  const records = []

  for (const s of validSheets) {
    const recipientId = getEvaluationReminderRecipientId(s)
    const recipientName = await loadEmployeeName(supabase, user.tenant_id, recipientId)
    const mailResult = await trySendEvaluationReminderEmail({
      tenantId: user.tenant_id,
      recipientEmployeeId: recipientId,
      recipientName,
      periodName,
      flowStatus: s.flow_status,
      message: input.message,
      isOverdue: false,
    })
    if (mailResult.emailSent) emailSentCount += 1

    records.push({
      tenant_id: user.tenant_id,
      period_id: input.period_id,
      sheet_id: s.id,
      sent_by: user.employee_id,
      reminder_type: 'bulk_nudge' as const,
      message: input.message?.trim() || null,
      target_status: s.flow_status,
      email_sent: mailResult.emailSent,
      email_error: mailResult.emailError,
    })
  }

  const { error } = await (supabase as any).from('evaluation_reminders').insert(records)
  if (error) return { success: false, sent_count: 0, error: error.message }

  revalidatePath(APP_ROUTES.EVALUATION.WORKFLOW)
  return { success: true, sent_count: validSheets.length, email_sent_count: emailSentCount }
}

/** フロー状態を差し戻す（評価者 → 被評価者へ戻す） */
export async function rollbackEvaluationFlow(input: {
  sheet_id: string
  period_id: string
  to_status: string
  comment?: string
}): Promise<EvalActionResult> {
  const user = await getServerUser()
  if (!user?.tenant_id || !user.employee_id) return { success: false, error: '権限がありません' }

  const supabase = await createClient()

  const { data: sheet } = await (supabase as any)
    .from('evaluation_sheets')
    .select('flow_status, is_locked, employee_id, primary_evaluator_id, secondary_evaluator_id, confirmer_id')
    .eq('id', input.sheet_id)
    .eq('tenant_id', user.tenant_id)
    .maybeSingle()

  if (!sheet) return { success: false, error: '評価シートが見つかりません' }
  if (sheet.is_locked) return { success: false, error: '確定済みのシートは変更できません' }

  const fromStatus = sheet.flow_status

  const { error: updateErr } = await (supabase as any)
    .from('evaluation_sheets')
    .update({
      flow_status: input.to_status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.sheet_id)

  if (updateErr) return { success: false, error: updateErr.message }

  await (supabase as any).from('evaluation_flow_logs').insert({
    tenant_id: user.tenant_id,
    sheet_id: input.sheet_id,
    from_status: fromStatus,
    to_status: input.to_status,
    changed_by: user.employee_id,
    comment: input.comment ?? null,
  })

  const periodName = await loadPeriodName(supabase, user.tenant_id, input.period_id)
  const recipientId = getEvaluationReminderRecipientId({
    ...sheet,
    flow_status: input.to_status,
  })
  const recipientName = await loadEmployeeName(supabase, user.tenant_id, recipientId)
  const mailResult = await trySendEvaluationReminderEmail({
    tenantId: user.tenant_id,
    recipientEmployeeId: recipientId,
    recipientName,
    periodName,
    flowStatus: input.to_status as FlowStatus,
    message: input.comment?.trim() || '差し戻しが行われました',
    isOverdue: false,
  })

  await (supabase as any).from('evaluation_reminders').insert({
    tenant_id: user.tenant_id,
    period_id: input.period_id,
    sheet_id: input.sheet_id,
    sent_by: user.employee_id,
    reminder_type: 'rollback_notify',
    message: input.comment?.trim() || '差し戻しが行われました',
    target_status: input.to_status,
    email_sent: mailResult.emailSent,
    email_error: mailResult.emailError,
  })

  revalidatePath(APP_ROUTES.EVALUATION.WORKFLOW)
  revalidatePath(APP_ROUTES.EVALUATION.ADMIN_LIST)
  return { success: true }
}

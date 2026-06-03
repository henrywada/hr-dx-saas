'use server'

import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { revalidatePath } from 'next/cache'
import { APP_ROUTES } from '@/config/routes'
import type { EvalActionResult } from './types'

/** 単一シートへリマインダーを送信する（アプリ内通知ログとして記録） */
export async function sendReminder(input: {
  period_id: string
  sheet_id: string
  reminder_type: 'deadline_approaching' | 'overdue' | 'bulk_nudge' | 'rollback_notify'
  message?: string
  target_status?: string
}): Promise<EvalActionResult> {
  const user = await getServerUser()
  if (!user?.tenant_id || !user.employee_id) return { success: false, error: '権限がありません' }

  const supabase = await createClient()

  const { data: sheet } = await (supabase as any)
    .from('evaluation_sheets')
    .select('id')
    .eq('id', input.sheet_id)
    .eq('tenant_id', user.tenant_id)
    .maybeSingle()

  if (!sheet) return { success: false, error: '評価シートが見つかりません' }

  const { error } = await (supabase as any).from('evaluation_reminders').insert({
    tenant_id: user.tenant_id,
    period_id: input.period_id,
    sheet_id: input.sheet_id,
    sent_by: user.employee_id,
    reminder_type: input.reminder_type,
    message: input.message?.trim() || null,
    target_status: input.target_status ?? null,
  })

  if (error) return { success: false, error: error.message }

  revalidatePath(APP_ROUTES.EVALUATION.WORKFLOW)
  return { success: true }
}

/** 複数シートへ一括リマインダーを送信する */
export async function sendBulkReminder(input: {
  period_id: string
  sheet_ids: string[]
  message?: string
}): Promise<{ success: boolean; sent_count: number; error?: string }> {
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

  const { data: sheets } = await (supabase as any)
    .from('evaluation_sheets')
    .select('id, flow_status')
    .eq('tenant_id', user.tenant_id)
    .eq('period_id', input.period_id)
    .in('id', input.sheet_ids)

  const validSheets = (sheets ?? []) as { id: string; flow_status: string }[]
  if (validSheets.length === 0) {
    return { success: false, sent_count: 0, error: '有効なシートがありません' }
  }

  const records = validSheets.map(s => ({
    tenant_id: user.tenant_id,
    period_id: input.period_id,
    sheet_id: s.id,
    sent_by: user.employee_id,
    reminder_type: 'bulk_nudge' as const,
    message: input.message?.trim() || null,
    target_status: s.flow_status,
  }))

  const { error } = await (supabase as any).from('evaluation_reminders').insert(records)
  if (error) return { success: false, sent_count: 0, error: error.message }

  revalidatePath(APP_ROUTES.EVALUATION.WORKFLOW)
  return { success: true, sent_count: validSheets.length }
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
    .select('flow_status, is_locked')
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

  await (supabase as any).from('evaluation_reminders').insert({
    tenant_id: user.tenant_id,
    period_id: input.period_id,
    sheet_id: input.sheet_id,
    sent_by: user.employee_id,
    reminder_type: 'rollback_notify',
    message: input.comment?.trim() || '差し戻しが行われました',
    target_status: input.to_status,
  })

  revalidatePath(APP_ROUTES.EVALUATION.WORKFLOW)
  revalidatePath(APP_ROUTES.EVALUATION.ADMIN_LIST)
  return { success: true }
}

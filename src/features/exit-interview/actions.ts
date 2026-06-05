'use server'

import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { revalidatePath } from 'next/cache'
import { APP_ROUTES } from '@/config/routes'
import type { ExitInterviewInput, ActionResult } from './types'
import { exitInterviewSchema, EXIT_INTERVIEW_ALLOWED_ROLES } from './types'

async function authorizeHr() {
  const user = await getServerUser()
  if (!user?.tenant_id) throw new Error('Unauthorized')
  if (!(EXIT_INTERVIEW_ALLOWED_ROLES as readonly string[]).includes(user.appRole ?? '')) throw new Error('Forbidden')
  return user
}

function calcTenureMonths(startDate: string, exitDate: string): number {
  const start = new Date(startDate)
  const exit = new Date(exitDate)
  return Math.max(
    0,
    (exit.getFullYear() - start.getFullYear()) * 12 +
      (exit.getMonth() - start.getMonth())
  )
}

/** 退職面談記録を新規作成する */
export async function createExitInterview(input: ExitInterviewInput): Promise<ActionResult> {
  try {
    const user = await authorizeHr()
    const parsed = exitInterviewSchema.safeParse(input)
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? '入力が不正です' }
    const supabase = await createClient()

    const { data: recorder } = await (supabase as any)
      .from('employees')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    let tenureMonths = 0
    if (input.employee_id) {
      const { data: emp } = await (supabase as any)
        .from('employees')
        .select('start_date')
        .eq('id', input.employee_id)
        .maybeSingle()
      if (emp?.start_date) {
        tenureMonths = calcTenureMonths(emp.start_date, input.exit_date)
      }
    }

    const { error } = await (supabase as any).from('exit_interviews').insert({
      tenant_id: user.tenant_id,
      employee_id: input.employee_id || null,
      employee_name: input.employee_name,
      department_name: input.department_name || null,
      exit_date: input.exit_date,
      tenure_months: tenureMonths,
      age_group: input.age_group,
      main_reason: input.main_reason,
      sub_reasons: input.sub_reasons,
      notes: input.notes.trim() || null,
      recorded_by: recorder?.id ?? null,
    })
    if (error) return { success: false, error: error.message }
    revalidatePath(APP_ROUTES.TENANT.ADMIN_EXIT_INTERVIEW)
    return { success: true }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : '予期せぬエラー' }
  }
}

/** 退職面談記録を更新する */
export async function updateExitInterview(
  id: string,
  input: ExitInterviewInput
): Promise<ActionResult> {
  try {
    const user = await authorizeHr()
    const parsed = exitInterviewSchema.safeParse(input)
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? '入力が不正です' }
    const supabase = await createClient()

    let tenureMonths = 0
    if (input.employee_id) {
      const { data: emp } = await (supabase as any)
        .from('employees')
        .select('start_date')
        .eq('id', input.employee_id)
        .maybeSingle()
      if (emp?.start_date) {
        tenureMonths = calcTenureMonths(emp.start_date, input.exit_date)
      }
    }

    const { error } = await (supabase as any)
      .from('exit_interviews')
      .update({
        employee_id: input.employee_id || null,
        employee_name: input.employee_name,
        department_name: input.department_name || null,
        exit_date: input.exit_date,
        tenure_months: tenureMonths,
        age_group: input.age_group,
        main_reason: input.main_reason,
        sub_reasons: input.sub_reasons,
        notes: input.notes.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('tenant_id', user.tenant_id)
    if (error) return { success: false, error: error.message }
    revalidatePath(APP_ROUTES.TENANT.ADMIN_EXIT_INTERVIEW)
    return { success: true }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : '予期せぬエラー' }
  }
}

/** 退職面談記録を削除する */
export async function deleteExitInterview(id: string): Promise<ActionResult> {
  try {
    const user = await authorizeHr()
    const supabase = await createClient()
    const { error } = await (supabase as any)
      .from('exit_interviews')
      .delete()
      .eq('id', id)
      .eq('tenant_id', user.tenant_id)
    if (error) return { success: false, error: error.message }
    revalidatePath(APP_ROUTES.TENANT.ADMIN_EXIT_INTERVIEW)
    return { success: true }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : '予期せぬエラー' }
  }
}

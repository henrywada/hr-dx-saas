'use server'

import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { APP_ROUTES } from '@/config/routes'
import { canConductCareerDiscussion, createCareerDiscussionSchema, updateCareerDiscussionSchema, scheduleAppointmentSchema, updateAppointmentSchema, templateSchema } from './types'

const HR_ROLES = ['hr', 'hr_manager', 'tenant_admin', 'developer']

/** キャリア面談を記録する */
export async function createCareerDiscussion(input: {
  employeeId: string
  theme: string
  careerAspiration?: string
  notes?: string
  nextDate?: string
  evaluationPeriodId?: string
  conductedAt?: string
  oneOnOneSessionId?: string
}): Promise<{ success: boolean; error?: string }> {
  const user = await getServerUser()
  if (!user?.tenant_id || !user.employee_id) {
    return { success: false, error: 'Unauthorized' }
  }

  if (!canConductCareerDiscussion(user.appRole, user.is_manager)) {
    return { success: false, error: 'Permission denied' }
  }

  const parsed = createCareerDiscussionSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: 'Invalid input' }
  }

  const supabase = await createClient()

  if (parsed.data.oneOnOneSessionId) {
    const { data: session, error: sessionError } = await supabase
      .from('one_on_one_sessions')
      .select('id, employee_id')
      .eq('id', parsed.data.oneOnOneSessionId)
      .eq('tenant_id', user.tenant_id)
      .maybeSingle()

    if (sessionError) return { success: false, error: sessionError.message }
    if (!session || session.employee_id !== parsed.data.employeeId) {
      return { success: false, error: 'Invalid 1on1 session link' }
    }
  }

  const { error } = await supabase.from('career_discussions').insert({
    tenant_id: user.tenant_id,
    employee_id: parsed.data.employeeId,
    conducted_by_employee_id: user.employee_id,
    theme: parsed.data.theme,
    career_aspiration: parsed.data.careerAspiration ?? null,
    notes: parsed.data.notes ?? null,
    next_date: parsed.data.nextDate ?? null,
    evaluation_period_id: parsed.data.evaluationPeriodId ?? null,
    conducted_at: parsed.data.conductedAt ?? new Date().toISOString(),
    one_on_one_session_id: parsed.data.oneOnOneSessionId ?? null,
  })

  if (error) return { success: false, error: error.message }

  revalidatePath(APP_ROUTES.TENANT.CAREER_DISCUSSIONS)
  revalidatePath(APP_ROUTES.TENANT.ADMIN_CAREER_DISCUSSIONS)
  return { success: true }
}

/** キャリア面談記録を更新する */
export async function updateCareerDiscussion(input: {
  id: string
  theme: string
  careerAspiration?: string
  notes?: string
  nextDate?: string | null
  evaluationPeriodId?: string | null
  conductedAt?: string
}): Promise<{ success: boolean; error?: string }> {
  const user = await getServerUser()
  if (!user?.tenant_id) {
    return { success: false, error: 'Unauthorized' }
  }

  if (!canConductCareerDiscussion(user.appRole, user.is_manager)) {
    return { success: false, error: 'Permission denied' }
  }

  const parsed = updateCareerDiscussionSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: 'Invalid input' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('career_discussions')
    .update({
      theme: parsed.data.theme,
      career_aspiration: parsed.data.careerAspiration ?? null,
      notes: parsed.data.notes ?? null,
      next_date: parsed.data.nextDate ?? null,
      evaluation_period_id: parsed.data.evaluationPeriodId ?? null,
      ...(parsed.data.conductedAt ? { conducted_at: parsed.data.conductedAt } : {}),
    })
    .eq('id', parsed.data.id)
    .eq('tenant_id', user.tenant_id)

  if (error) return { success: false, error: error.message }

  revalidatePath(APP_ROUTES.TENANT.CAREER_DISCUSSIONS)
  revalidatePath(APP_ROUTES.TENANT.ADMIN_CAREER_DISCUSSIONS)
  return { success: true }
}

/** キャリア面談記録を削除する */
export async function deleteCareerDiscussion(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const user = await getServerUser()
  if (!user?.tenant_id) {
    return { success: false, error: 'Unauthorized' }
  }

  if (!canConductCareerDiscussion(user.appRole, user.is_manager)) {
    return { success: false, error: 'Permission denied' }
  }

  if (!idSchema.safeParse(id).success) {
    return { success: false, error: 'Invalid input' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('career_discussions')
    .delete()
    .eq('id', id)
    .eq('tenant_id', user.tenant_id)

  if (error) return { success: false, error: error.message }

  revalidatePath(APP_ROUTES.TENANT.CAREER_DISCUSSIONS)
  revalidatePath(APP_ROUTES.TENANT.ADMIN_CAREER_DISCUSSIONS)
  return { success: true }
}

/** テーマテンプレートを追加する（HR向け） */
export async function addCareerDiscussionThemeTemplate(input: {
  name: string
  description?: string
  sortOrder?: number
}): Promise<{ success: boolean; error?: string }> {
  const user = await getServerUser()
  if (!user?.tenant_id) {
    return { success: false, error: 'Unauthorized' }
  }

  if (!HR_ROLES.includes(user.appRole ?? '')) {
    return { success: false, error: 'Permission denied' }
  }

  const parsed = templateSchema.safeParse({
    name: input.name,
    description: input.description,
    sortOrder: input.sortOrder ?? 0,
  })
  if (!parsed.success) {
    return { success: false, error: 'Invalid input' }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('career_discussion_theme_templates').insert({
    tenant_id: user.tenant_id,
    name: parsed.data.name,
    description: parsed.data.description ?? null,
    sort_order: parsed.data.sortOrder,
  })

  if (error) return { success: false, error: error.message }

  revalidatePath(APP_ROUTES.TENANT.ADMIN_CAREER_DISCUSSIONS)
  return { success: true }
}

/** デフォルトテーマテンプレートをシードする（テナント初回セットアップ用・冪等） */
export async function seedDefaultCareerThemeTemplates(): Promise<{
  success: boolean
  error?: string
}> {
  const user = await getServerUser()
  if (!user?.tenant_id) {
    return { success: false, error: 'Unauthorized' }
  }

  if (!HR_ROLES.includes(user.appRole ?? '')) {
    return { success: false, error: 'Permission denied' }
  }

  const supabase = await createClient()

  const { data: existing } = await supabase
    .from('career_discussion_theme_templates')
    .select('id')
    .eq('tenant_id', user.tenant_id)
    .limit(1)

  if (existing && existing.length > 0) {
    return { success: true }
  }

  const defaults = [
    {
      name: '将来のキャリア志向',
      description: '本人の将来のキャリア像をヒアリングする',
      sort_order: 0,
    },
    { name: '異動・昇進希望', description: '異動・昇進に関する希望を確認する', sort_order: 1 },
    {
      name: 'スキル開発計画',
      description: '今後伸ばしたいスキル・学習計画を話し合う',
      sort_order: 2,
    },
    {
      name: '現在の業務満足度',
      description: '現在の業務への満足度・不満を確認する',
      sort_order: 3,
    },
    { name: '長期的な目標', description: '3〜5年先のキャリア目標を話し合う', sort_order: 4 },
  ]

  const { error } = await supabase
    .from('career_discussion_theme_templates')
    .insert(defaults.map(d => ({ ...d, tenant_id: user.tenant_id! })))

  if (error) return { success: false, error: error.message }

  return { success: true }
}

const idSchema = z.string().uuid()

/** テーマテンプレートを無効化する（論理削除：is_active=false） */
export async function deactivateCareerThemeTemplate(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const user = await getServerUser()
  if (!user?.tenant_id) {
    return { success: false, error: 'Unauthorized' }
  }

  if (!HR_ROLES.includes(user.appRole ?? '')) {
    return { success: false, error: 'Permission denied' }
  }

  if (!idSchema.safeParse(id).success) {
    return { success: false, error: 'Invalid input' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('career_discussion_theme_templates')
    .update({ is_active: false })
    .eq('id', id)
    .eq('tenant_id', user.tenant_id)

  if (error) return { success: false, error: error.message }

  revalidatePath(APP_ROUTES.TENANT.ADMIN_CAREER_DISCUSSIONS)
  return { success: true }
}

function revalidateCareerPaths() {
  revalidatePath(APP_ROUTES.TENANT.CAREER_DISCUSSIONS)
  revalidatePath(APP_ROUTES.TENANT.ADMIN_CAREER_DISCUSSIONS)
}

/** キャリア面談を予約する */
export async function scheduleCareerAppointment(input: {
  employeeId: string
  theme?: string
  scheduledAt: string
  notes?: string
}): Promise<{ success: boolean; error?: string }> {
  const user = await getServerUser()
  if (!user?.tenant_id || !user.employee_id) {
    return { success: false, error: 'Unauthorized' }
  }

  if (!canConductCareerDiscussion(user.appRole, user.is_manager)) {
    return { success: false, error: 'Permission denied' }
  }

  const parsed = scheduleAppointmentSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: 'Invalid input' }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('career_discussion_appointments').insert({
    tenant_id: user.tenant_id,
    employee_id: parsed.data.employeeId,
    scheduled_by_employee_id: user.employee_id,
    theme: parsed.data.theme ?? null,
    scheduled_at: parsed.data.scheduledAt,
    notes: parsed.data.notes ?? null,
    status: 'scheduled',
  })

  if (error) return { success: false, error: error.message }

  revalidateCareerPaths()
  return { success: true }
}

/** キャリア面談予約を更新する */
export async function updateCareerAppointment(input: {
  id: string
  employeeId: string
  theme?: string
  scheduledAt: string
  notes?: string
}): Promise<{ success: boolean; error?: string }> {
  const user = await getServerUser()
  if (!user?.tenant_id) {
    return { success: false, error: 'Unauthorized' }
  }

  if (!canConductCareerDiscussion(user.appRole, user.is_manager)) {
    return { success: false, error: 'Permission denied' }
  }

  const parsed = updateAppointmentSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: 'Invalid input' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('career_discussion_appointments')
    .update({
      employee_id: parsed.data.employeeId,
      theme: parsed.data.theme ?? null,
      scheduled_at: parsed.data.scheduledAt,
      notes: parsed.data.notes ?? null,
    })
    .eq('id', parsed.data.id)
    .eq('tenant_id', user.tenant_id)
    .eq('status', 'scheduled')

  if (error) return { success: false, error: error.message }

  revalidateCareerPaths()
  return { success: true }
}

/** キャリア面談予約をキャンセルする */
export async function cancelCareerAppointment(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const user = await getServerUser()
  if (!user?.tenant_id) {
    return { success: false, error: 'Unauthorized' }
  }

  if (!canConductCareerDiscussion(user.appRole, user.is_manager)) {
    return { success: false, error: 'Permission denied' }
  }

  if (!idSchema.safeParse(id).success) {
    return { success: false, error: 'Invalid input' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('career_discussion_appointments')
    .update({ status: 'cancelled' })
    .eq('id', id)
    .eq('tenant_id', user.tenant_id)
    .eq('status', 'scheduled')

  if (error) return { success: false, error: error.message }

  revalidateCareerPaths()
  return { success: true }
}

/** キャリア面談予約を実施済みにする */
export async function completeCareerAppointment(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const user = await getServerUser()
  if (!user?.tenant_id) {
    return { success: false, error: 'Unauthorized' }
  }

  if (!canConductCareerDiscussion(user.appRole, user.is_manager)) {
    return { success: false, error: 'Permission denied' }
  }

  if (!idSchema.safeParse(id).success) {
    return { success: false, error: 'Invalid input' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('career_discussion_appointments')
    .update({ status: 'completed' })
    .eq('id', id)
    .eq('tenant_id', user.tenant_id)
    .eq('status', 'scheduled')

  if (error) return { success: false, error: error.message }

  revalidateCareerPaths()
  return { success: true }
}

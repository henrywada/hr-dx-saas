'use server'

import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { APP_ROUTES } from '@/config/routes'
import { canConductOneOnOne } from './types'

const sessionSchema = z.object({
  employeeId: z.string().uuid(),
  theme: z.string().min(1).max(200),
  notes: z.string().max(2000).optional(),
  nextDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  conductedAt: z.string().datetime().optional(),
})

/** 1on1セッションを記録する */
export async function recordOneOnOneSession(input: {
  employeeId: string
  theme: string
  notes?: string
  nextDate?: string
  conductedAt?: string
}): Promise<{ success: boolean; error?: string }> {
  const user = await getServerUser()
  if (!user?.tenant_id || !user.employee_id) {
    return { success: false, error: 'Unauthorized' }
  }

  if (!canConductOneOnOne(user.appRole, user.is_manager)) {
    return { success: false, error: 'Permission denied' }
  }

  const parsed = sessionSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: 'Invalid input' }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('one_on_one_sessions').insert({
    tenant_id: user.tenant_id,
    manager_id: user.employee_id,
    employee_id: parsed.data.employeeId,
    theme: parsed.data.theme,
    notes: parsed.data.notes ?? null,
    next_date: parsed.data.nextDate ?? null,
    conducted_at: parsed.data.conductedAt ?? new Date().toISOString(),
  })

  if (error) return { success: false, error: error.message }

  revalidatePath(APP_ROUTES.TENANT.ADMIN_ONE_ON_ONE)
  return { success: true }
}

const updateSessionSchema = sessionSchema.extend({
  id: z.string().uuid(),
})

/** 1on1セッションを更新する */
export async function updateOneOnOneSession(input: {
  id: string
  employeeId: string
  theme: string
  notes?: string
  nextDate?: string
  conductedAt?: string
}): Promise<{ success: boolean; error?: string }> {
  const user = await getServerUser()
  if (!user?.tenant_id || !user.employee_id) {
    return { success: false, error: 'Unauthorized' }
  }

  if (!canConductOneOnOne(user.appRole, user.is_manager)) {
    return { success: false, error: 'Permission denied' }
  }

  const parsed = updateSessionSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: 'Invalid input' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('one_on_one_sessions')
    .update({
      employee_id: parsed.data.employeeId,
      theme: parsed.data.theme,
      notes: parsed.data.notes ?? null,
      next_date: parsed.data.nextDate ?? null,
      conducted_at: parsed.data.conductedAt ?? new Date().toISOString(),
    })
    .eq('id', parsed.data.id)
    .eq('tenant_id', user.tenant_id) // テナント越境防止（RLSと二重で防御）

  if (error) return { success: false, error: error.message }

  revalidatePath(APP_ROUTES.TENANT.ADMIN_ONE_ON_ONE)
  return { success: true }
}

/** 1on1セッションを削除する */
export async function deleteOneOnOneSession(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const user = await getServerUser()
  if (!user?.tenant_id) {
    return { success: false, error: 'Unauthorized' }
  }

  if (!canConductOneOnOne(user.appRole, user.is_manager)) {
    return { success: false, error: 'Permission denied' }
  }

  if (!z.string().uuid().safeParse(id).success) {
    return { success: false, error: 'Invalid input' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('one_on_one_sessions')
    .delete()
    .eq('id', id)
    .eq('tenant_id', user.tenant_id) // テナント越境防止（RLSと二重で防御）

  if (error) return { success: false, error: error.message }

  revalidatePath(APP_ROUTES.TENANT.ADMIN_ONE_ON_ONE)
  return { success: true }
}

const templateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  sortOrder: z.number().int().min(0).max(999),
})

/** テーマテンプレートを追加する */
export async function addThemeTemplate(input: {
  name: string
  description?: string
  sortOrder?: number
}): Promise<{ success: boolean; error?: string }> {
  const user = await getServerUser()
  if (!user?.tenant_id) {
    return { success: false, error: 'Unauthorized' }
  }

  const HR_ROLES = ['hr', 'hr_manager', 'tenant_admin', 'developer']
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
  const { error } = await supabase.from('one_on_one_theme_templates').insert({
    tenant_id: user.tenant_id,
    name: parsed.data.name,
    description: parsed.data.description ?? null,
    sort_order: parsed.data.sortOrder,
  })

  if (error) return { success: false, error: error.message }

  revalidatePath(APP_ROUTES.TENANT.ADMIN_ONE_ON_ONE)
  return { success: true }
}

/** テーマテンプレートを無効化する（論理削除：is_active=false） */
export async function deactivateThemeTemplate(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const user = await getServerUser()
  if (!user?.tenant_id) {
    return { success: false, error: 'Unauthorized' }
  }

  const HR_ROLES = ['hr', 'hr_manager', 'tenant_admin', 'developer']
  if (!HR_ROLES.includes(user.appRole ?? '')) {
    return { success: false, error: 'Permission denied' }
  }

  if (!z.string().uuid().safeParse(id).success) {
    return { success: false, error: 'Invalid input' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('one_on_one_theme_templates')
    .update({ is_active: false })
    .eq('id', id)
    .eq('tenant_id', user.tenant_id)

  if (error) return { success: false, error: error.message }

  revalidatePath(APP_ROUTES.TENANT.ADMIN_ONE_ON_ONE)
  return { success: true }
}

/** デフォルトテーマテンプレートをシードする（テナント初回セットアップ用・冪等） */
export async function seedDefaultThemeTemplates(): Promise<{ success: boolean; error?: string }> {
  const user = await getServerUser()
  if (!user?.tenant_id) {
    return { success: false, error: 'Unauthorized' }
  }

  const HR_ROLES = ['hr', 'hr_manager', 'tenant_admin', 'developer']
  if (!HR_ROLES.includes(user.appRole ?? '')) {
    return { success: false, error: 'Permission denied' }
  }

  const supabase = await createClient()

  // 既存テンプレートが1件以上あればスキップ（冪等性を保証）
  const { data: existing } = await supabase
    .from('one_on_one_theme_templates')
    .select('id')
    .eq('tenant_id', user.tenant_id)
    .limit(1)

  if (existing && existing.length > 0) {
    return { success: true }
  }

  const defaults = [
    { name: '目標進捗確認', description: 'OKR・KPI の進捗を確認する', sort_order: 0 },
    {
      name: '悩み・困りごと相談',
      description: '業務や人間関係の困りごとをヒアリングする',
      sort_order: 1,
    },
    {
      name: 'キャリア・成長について',
      description: 'キャリアパスや成長目標を話し合う',
      sort_order: 2,
    },
    {
      name: 'ポジティブフィードバック',
      description: '良かった行動・成果を具体的に伝える',
      sort_order: 3,
    },
    { name: 'フリートーク', description: '特定テーマなし・リラックスした対話', sort_order: 4 },
  ]

  const { error } = await supabase
    .from('one_on_one_theme_templates')
    .insert(defaults.map(d => ({ ...d, tenant_id: user.tenant_id! })))

  if (error) return { success: false, error: error.message }

  // revalidatePath はレンダリング中に呼び出せないため省略（page.tsx から呼ばれるシード関数）
  return { success: true }
}

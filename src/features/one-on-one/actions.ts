'use server'

import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { APP_ROUTES } from '@/config/routes'
import { canConductOneOnOne } from './types'
import { resolveEmployeeEmail } from '@/lib/mail/resolve-employee-email'
import { sendMail } from '@/lib/mail/send'
import { generateGeminiContent, GEMINI_FLASH_MODEL } from '@/lib/ai/gemini'

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


const upcomingSchema = z.object({
  employeeId: z.string().uuid(),
  theme: z.string().min(1).max(200),
  agenda: z.string().max(4000).optional(),
  scheduledAt: z.string().datetime(),
})

/** 1on1 予定を登録する（O-C1: アジェンダ事前共有） */
export async function createUpcomingOneOnOne(input: {
  employeeId: string
  theme: string
  agenda?: string
  scheduledAt: string
}): Promise<{ success: boolean; error?: string }> {
  const user = await getServerUser()
  if (!user?.tenant_id || !user.employee_id) return { success: false, error: 'Unauthorized' }
  if (!canConductOneOnOne(user.appRole, user.is_manager)) {
    return { success: false, error: 'Permission denied' }
  }

  const parsed = upcomingSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Invalid input' }

  const supabase = await createClient()
  const { error } = await (supabase as any).from('one_on_one_upcoming').insert({
    tenant_id: user.tenant_id,
    manager_id: user.employee_id,
    employee_id: parsed.data.employeeId,
    theme: parsed.data.theme,
    agenda: parsed.data.agenda ?? null,
    scheduled_at: parsed.data.scheduledAt,
  })

  if (error) return { success: false, error: error.message }

  revalidatePath(APP_ROUTES.TENANT.ADMIN_ONE_ON_ONE)
  revalidatePath(APP_ROUTES.TENANT.MY_ONE_ON_ONE)
  return { success: true }
}

/** 1on1 予定をキャンセルする */
export async function cancelUpcomingOneOnOne(id: string): Promise<{ success: boolean; error?: string }> {
  const user = await getServerUser()
  if (!user?.tenant_id || !user.employee_id) return { success: false, error: 'Unauthorized' }
  if (!canConductOneOnOne(user.appRole, user.is_manager)) {
    return { success: false, error: 'Permission denied' }
  }
  if (!z.string().uuid().safeParse(id).success) return { success: false, error: 'Invalid input' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('one_on_one_upcoming')
    .update({ status: 'cancelled' })
    .eq('id', id)
    .eq('tenant_id', user.tenant_id)

  if (error) return { success: false, error: error.message }

  revalidatePath(APP_ROUTES.TENANT.ADMIN_ONE_ON_ONE)
  revalidatePath(APP_ROUTES.TENANT.MY_ONE_ON_ONE)
  return { success: true }
}

/** 1on1 予定のリマインドメールを部下へ送信する */
export async function sendUpcomingOneOnOneReminder(
  id: string,
): Promise<{ success: boolean; emailSent?: boolean; error?: string }> {
  const user = await getServerUser()
  if (!user?.tenant_id || !user.employee_id) return { success: false, error: 'Unauthorized' }
  if (!canConductOneOnOne(user.appRole, user.is_manager)) {
    return { success: false, error: 'Permission denied' }
  }

  const supabase = await createClient()
  const { data: row, error: fetchError } = await supabase
    .from('one_on_one_upcoming')
    .select('id, employee_id, theme, agenda, scheduled_at, status')
    .eq('id', id)
    .eq('tenant_id', user.tenant_id)
    .maybeSingle()

  if (fetchError || !row) return { success: false, error: '予定が見つかりません' }
  if (row.status !== 'scheduled') return { success: false, error: '送信対象外のステータスです' }

  const { data: emp } = await supabase
    .from('employees')
    .select('name')
    .eq('id', row.employee_id)
    .eq('tenant_id', user.tenant_id)
    .maybeSingle()

  const email = await resolveEmployeeEmail(row.employee_id, user.tenant_id)
  if (!email) return { success: false, error: '部下のメールアドレスが取得できません' }

  const scheduledLabel = new Date(row.scheduled_at).toLocaleString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const agendaBlock = row.agenda ? `\n\n【アジェンダ】\n${row.agenda}` : ''
  const text = `${emp?.name ?? '従業員'} 様\n\n1on1 の予定のお知らせです。\n\n日時: ${scheduledLabel}\nテーマ: ${row.theme}${agendaBlock}\n\nHR-DX の「私の 1on1」画面でも内容を確認できます。`

  try {
    await sendMail({
      to: email,
      subject: `【HR-DX】1on1 予定のお知らせ（${row.theme}）`,
      text,
    })
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'メール送信に失敗しました',
    }
  }

  await supabase
    .from('one_on_one_upcoming')
    .update({ reminded_at: new Date().toISOString() })
    .eq('id', id)
    .eq('tenant_id', user.tenant_id)

  revalidatePath(APP_ROUTES.TENANT.ADMIN_ONE_ON_ONE)
  return { success: true, emailSent: true }
}


/** 1on1 記録を AI 要約する（O-C2） */
export async function summarizeOneOnOneSession(
  sessionId: string,
): Promise<{ success: boolean; summary?: string; error?: string }> {
  const user = await getServerUser()
  if (!user?.tenant_id || !user.employee_id) return { success: false, error: 'Unauthorized' }
  if (!canConductOneOnOne(user.appRole, user.is_manager)) {
    return { success: false, error: 'Permission denied' }
  }
  if (!z.string().uuid().safeParse(sessionId).success) {
    return { success: false, error: 'Invalid input' }
  }

  const supabase = await createClient()
  const { data: session, error: fetchError } = await supabase
    .from('one_on_one_sessions')
    .select('id, theme, notes, employee_id, conducted_at, ai_summary')
    .eq('id', sessionId)
    .eq('tenant_id', user.tenant_id)
    .maybeSingle()

  if (fetchError || !session) return { success: false, error: 'セッションが見つかりません' }
  if (!session.notes?.trim()) return { success: false, error: '要約する記録内容がありません' }
  if (session.ai_summary) return { success: true, summary: session.ai_summary }

  if (!process.env.GEMINI_API_KEY) {
    return { success: false, error: 'GEMINI_API_KEY が設定されていません' }
  }

  const { data: employee } = await supabase
    .from('employees')
    .select('name')
    .eq('id', session.employee_id)
    .eq('tenant_id', user.tenant_id)
    .maybeSingle()

  const conductedLabel = new Date(session.conducted_at).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })

  let summary: string
  try {
    summary = await generateGeminiContent({
      model: GEMINI_FLASH_MODEL,
      system: 'あなたは日本の人事向け1on1記録アシスタントです。事実のみを簡潔な日本語で要約し、箇条書き3〜5点と次アクション1行を含めてください。',
      prompt: `以下の1on1記録を要約してください。\n\n部下: ${employee?.name ?? '不明'}\nテーマ: ${session.theme}\n実施日: ${conductedLabel}\n\n記録:\n${session.notes}`,
      temperature: 0.3,
      maxOutputTokens: 800,
    })
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'AI要約に失敗しました' }
  }

  const trimmed = summary.trim()
  if (!trimmed) return { success: false, error: 'AI要約が空でした' }

  const { error: updateError } = await supabase
    .from('one_on_one_sessions')
    .update({ ai_summary: trimmed })
    .eq('id', sessionId)
    .eq('tenant_id', user.tenant_id)

  if (updateError) return { success: false, error: updateError.message }

  revalidatePath(APP_ROUTES.TENANT.ADMIN_ONE_ON_ONE)
  return { success: true, summary: trimmed }
}

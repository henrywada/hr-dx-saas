'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { APP_ROUTES } from '@/config/routes'
import { getServerUser } from '@/lib/auth/server-user'
import { toJSTISOString } from '@/lib/datetime'
import { sendMail } from '@/lib/mail/send'

const ADM_PATH = APP_ROUTES.TENANT.ADMIN

// announcements / pulse_survey_periods 等は型定義に含まれない場合があるため any でラップ
async function getSupabase() {
  return (await createClient()) as any
}

// ========== announcements ==========

export async function createAnnouncement(values: {
  title: string
  body?: string | null
  published_at?: string
  is_new?: boolean
  target_audience?: string | null
  sort_order?: number
}) {
  const user = await getServerUser()
  if (!user?.tenant_id) {
    return { success: false, error: '認証が必要です' }
  }

  const supabase = await getSupabase()
  const { data, error } = await supabase
    .from('announcements')
    .insert({
      tenant_id: user.tenant_id,
      title: values.title,
      body: values.body ?? null,
      published_at: values.published_at ?? toJSTISOString(),
      is_new: values.is_new ?? true,
      target_audience: values.target_audience ?? null,
      sort_order: values.sort_order ?? 0,
    })
    .select()
    .single()

  if (error) {
    console.error('createAnnouncement error:', error)
    return { success: false, error: error.message }
  }
  revalidatePath(`${ADM_PATH}/announcements`)
  revalidatePath(APP_ROUTES.TENANT.PORTAL)
  return { success: true, data }
}

export async function updateAnnouncement(
  id: string,
  updates: {
    title?: string
    body?: string | null
    published_at?: string
    is_new?: boolean
    target_audience?: string | null
    sort_order?: number
  }
) {
  const supabase = await getSupabase()
  const { data, error } = await supabase
    .from('announcements')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('updateAnnouncement error:', error)
    return { success: false, error: error.message }
  }
  revalidatePath(`${ADM_PATH}/announcements`)
  revalidatePath(APP_ROUTES.TENANT.PORTAL)
  return { success: true, data }
}

export async function deleteAnnouncement(id: string) {
  const supabase = await getSupabase()
  const { error } = await supabase.from('announcements').delete().eq('id', id)

  if (error) {
    console.error('deleteAnnouncement error:', error)
    return { success: false, error: error.message }
  }
  revalidatePath(`${ADM_PATH}/announcements`)
  revalidatePath(APP_ROUTES.TENANT.PORTAL)
  return { success: true }
}

// ========== pulse_survey_periods ==========

export async function createPulseSurveyPeriod(values: {
  survey_period: string
  title: string
  description?: string | null
  deadline_date: string
  link_path?: string | null
  sort_order?: number
}) {
  const user = await getServerUser()
  if (!user?.tenant_id) {
    return { success: false, error: '認証が必要です' }
  }

  const supabase = await getSupabase()
  const { data, error } = await supabase
    .from('pulse_survey_periods')
    .insert({
      tenant_id: user.tenant_id,
      survey_period: values.survey_period,
      title: values.title,
      description: values.description ?? null,
      deadline_date: values.deadline_date,
      link_path: values.link_path ?? null,
      sort_order: values.sort_order ?? 0,
    })
    .select()
    .single()

  if (error) {
    console.error('createPulseSurveyPeriod error:', error)
    return { success: false, error: error.message }
  }
  revalidatePath(`${ADM_PATH}/pulse-survey-periods`)
  revalidatePath(APP_ROUTES.TENANT.PORTAL)
  return { success: true, data }
}

export async function updatePulseSurveyPeriod(
  id: string,
  updates: {
    survey_period?: string
    title?: string
    description?: string | null
    deadline_date?: string
    link_path?: string | null
    sort_order?: number
  }
) {
  const supabase = await getSupabase()
  const { data, error } = await supabase
    .from('pulse_survey_periods')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('updatePulseSurveyPeriod error:', error)
    return { success: false, error: error.message }
  }
  revalidatePath(`${ADM_PATH}/pulse-survey-periods`)
  revalidatePath(APP_ROUTES.TENANT.PORTAL)
  return { success: true, data }
}

export async function deletePulseSurveyPeriod(id: string) {
  const supabase = await getSupabase()
  const { error } = await supabase
    .from('pulse_survey_periods')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('deletePulseSurveyPeriod error:', error)
    return { success: false, error: error.message }
  }
  revalidatePath(`${ADM_PATH}/pulse-survey-periods`)
  revalidatePath(APP_ROUTES.TENANT.PORTAL)
  return { success: true }
}

// ========== 人事へのお問合せ（メール） ==========

const hrInquirySchema = z.object({
  subject: z.string().trim().min(1, '件名を入力してください').max(200, '件名は200文字以内です'),
  body: z.string().trim().min(1, '本文を入力してください').max(8000, '本文は8000文字以内です'),
})

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function resolveHrInquiryToFromEnv(): string | null {
  const direct = process.env.HR_INQUIRY_EMAIL?.trim()
  if (direct) return direct
  const fallback = process.env.HR_ALERT_EMAIL_DEFAULT?.trim()
  if (fallback) return fallback
  return null
}

async function resolveHrInquiryToForTenant(tenantId: string): Promise<string | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tenant_portal_settings')
    .select('hr_inquiry_email')
    .eq('tenant_id', tenantId)
    .maybeSingle()
  if (error) {
    console.error('[sendHrInquiryMail] tenant_portal_settings', error)
  } else {
    const raw = data?.hr_inquiry_email?.trim()
    if (raw) return raw
  }
  return resolveHrInquiryToFromEnv()
}

export type SendHrInquiryMailResult =
  | { ok: true }
  | { ok: false; error: string }

export async function sendHrInquiryMail(formData: FormData): Promise<SendHrInquiryMailResult> {
  const user = await getServerUser()
  if (!user?.tenant_id) {
    return { ok: false, error: 'ログイン情報が取得できません。' }
  }

  const parsed = hrInquirySchema.safeParse({
    subject: formData.get('subject') ?? '',
    body: formData.get('body') ?? '',
  })
  if (!parsed.success) {
    const first = parsed.error.flatten().fieldErrors
    const msg =
      (first.subject && first.subject[0]) ||
      (first.body && first.body[0]) ||
      '入力内容を確認してください'
    return { ok: false, error: msg }
  }

  const { subject, body } = parsed.data
  const to = await resolveHrInquiryToForTenant(user.tenant_id)
  if (!to) {
    return {
      ok: false,
      error:
        '人事宛メールアドレスが未設定です。管理画面の「基本設定」で宛先を登録するか、管理者に HR_INQUIRY_EMAIL または HR_ALERT_EMAIL_DEFAULT の設定を依頼してください。',
    }
  }

  const senderLabel = [user.name, user.email].filter(Boolean).join(' / ')
  const metaLines = [
    `テナント: ${user.tenant_name ?? user.tenant_id}`,
    `ユーザーID: ${user.id}`,
    `従業員ID: ${user.employee_id ?? '（未紐付け）'}`,
    `社員番号: ${user.employee_no ?? '—'}`,
    `送信者: ${senderLabel}`,
  ]

  const html = `
<div style="font-family: sans-serif; line-height: 1.6;">
  <p><strong>件名（ユーザー入力）</strong></p>
  <p>${escapeHtml(subject)}</p>
  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 16px 0;" />
  <p><strong>本文</strong></p>
  <pre style="white-space: pre-wrap; background: #f8fafc; padding: 12px; border-radius: 8px;">${escapeHtml(body)}</pre>
  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 16px 0;" />
  <p style="font-size: 12px; color: #64748b;">${metaLines.map((l) => escapeHtml(l)).join('<br/>')}</p>
</div>
`

  const mailSubject = `【人事へのお問合せ】${subject}`

  try {
    await sendMail({ to, subject: mailSubject, html })
  } catch (e) {
    console.error('[sendHrInquiryMail]', e)
    return { ok: false, error: 'メール送信に失敗しました。しばらくしてから再度お試しください。' }
  }

  return { ok: true }
}

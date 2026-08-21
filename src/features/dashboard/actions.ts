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
  recipient_employee_id?: string | null
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
      recipient_employee_id: values.recipient_employee_id ?? null,
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
    recipient_employee_id?: string | null
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

/**
 * ドメイン機能（Kudos・コンディションアラート・健診面談推奨）から個人宛のシステム通知を投稿する。
 * announcements の INSERT RLS は hr/hr_manager/developer のみに制限されているため、
 * それ以外のロールから実行されるシステム通知は SECURITY DEFINER の専用RPC経由で投稿する。
 *
 * セキュリティ上の理由から、汎用の自由文字列RPC（post_system_announcement）は廃止した。
 * 呼び出し元が任意の title/body・任意の recipient_employee_id を指定できてしまうと、
 * 同一テナント内の任意の同僚へなりすましのシステム通知を偽装投稿できてしまうため、
 * 用途ごとにDB側で正当性を検証し固定テンプレートから本文を組み立てる専用RPCに分割している
 * （post_kudos_announcement / post_condition_alert_announcement / post_health_check_interview_announcement）。
 */

/** Kudos受信を announcements へ橋渡しする。呼び出し元が実際に作成した kudos 行にのみ紐付けられる。 */
export async function postKudosAnnouncement(values: {
  kudosId: string
  recipientEmployeeId: string
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await getSupabase()
  const { error } = await supabase.rpc('post_kudos_announcement', {
    p_kudos_id: values.kudosId,
    p_recipient_employee_id: values.recipientEmployeeId,
  })

  if (error) {
    console.error('postKudosAnnouncement error:', error)
    return { success: false, error: 'Kudos通知の投稿に失敗しました' }
  }
  revalidatePath(APP_ROUTES.TENANT.PORTAL)
  return { success: true }
}

/** コンディション低下アラートを産業医・保健師へ通知する。宛先はRPC内部で固定解決される。 */
export async function postConditionAlertAnnouncement(values: {
  employeeId: string
  alertLabel: string
  dedupeMarker: string
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await getSupabase()
  const { error } = await supabase.rpc('post_condition_alert_announcement', {
    p_employee_id: values.employeeId,
    p_alert_label: values.alertLabel,
    p_dedupe_marker: values.dedupeMarker,
  })

  if (error) {
    console.error('postConditionAlertAnnouncement error:', error)
    return { success: false, error: 'コンディションアラートの投稿に失敗しました' }
  }
  revalidatePath(APP_ROUTES.TENANT.PORTAL)
  return { success: true }
}

/** 健診結果を踏まえた面談推奨を本人へ通知する。呼び出し元が company_doctor ロールである必要がある。 */
export async function postHealthCheckInterviewAnnouncement(values: {
  recordId: string
  kind: 'nurse' | 'doctor'
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await getSupabase()
  const { error } = await supabase.rpc('post_health_check_interview_announcement', {
    p_record_id: values.recordId,
    p_kind: values.kind,
  })

  if (error) {
    console.error('postHealthCheckInterviewAnnouncement error:', error)
    return { success: false, error: '面談推奨通知の投稿に失敗しました' }
  }
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

/** ポータル「人事へメール」の宛先は tenant_portal_settings.hr_inquiry_email のみ（環境変数にはフォールバックしない） */
async function resolveHrInquiryEmailFromTenantSettings(tenantId: string): Promise<string | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tenant_portal_settings')
    .select('hr_inquiry_email')
    .eq('tenant_id', tenantId)
    .maybeSingle()
  if (error) {
    console.error('[sendHrInquiryMail] tenant_portal_settings', error)
    return null
  }
  const raw = data?.hr_inquiry_email?.trim()
  return raw || null
}

export type SendHrInquiryMailResult = { ok: true } | { ok: false; error: string }

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
  const to = await resolveHrInquiryEmailFromTenantSettings(user.tenant_id)
  if (!to) {
    return {
      ok: false,
      error:
        '人事宛メールアドレスが未設定です。管理画面の「基本設定」でお問合せ先の人事メールアドレスを登録してください。',
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
  <p style="font-size: 12px; color: #64748b;">${metaLines.map(l => escapeHtml(l)).join('<br/>')}</p>
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

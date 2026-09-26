/**
 * LINE友だち招待 — Server Actions（書き込み操作）
 *
 * createAdminClient() は使わない。createClient() のみ使用。
 */

'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { isLineEnabledForTenant } from '@/lib/line/line-enabled'
import { getMyouTenantIds } from '@/lib/auth/tenant-audience'
import { generateInviteToken, inviteExpiryDate } from '@/lib/line/inviteToken'
import { buildFriendInviteEmail } from '@/lib/mail/build-line-friend-invite-email'
import { sendMail } from '@/lib/mail/send'
import { APP_ROUTES } from '@/config/routes'
import type { SendFriendInvitesResult } from './types'

/**
 * 指定した従業員への LINE 友だち招待メールを一括送信する
 *
 * - 管理者（app_role <> 'employee'）のみ実行可能
 * - 1件ずつ: invite_token を INSERT → メール解決 → sendMail
 * - INSERT 成功・メール送信失敗は failed に積んで次へ続ける
 */
export async function sendFriendInvites(employeeIds: string[]): Promise<SendFriendInvitesResult> {
  const user = await getServerUser()
  if (!user) throw new Error('Unauthorized')
  if (user.appRole === 'employee') throw new Error('Forbidden')
  if (!user.tenant_id) throw new Error('Unauthorized')
  // MYOU テナントは LINE 連携を使わないため招待を作成しない
  if (!isLineEnabledForTenant(user.tenant_id, getMyouTenantIds())) {
    throw new Error('この会社ではLINE連携をご利用いただけません')
  }

  const supabase = await createClient()

  // テナントの会社名を取得（招待メールの件名・本文に使用）
  const { data: tenantRow } = await supabase
    .from('tenants')
    .select('company_name')
    .eq('id', user.tenant_id)
    .single()
  const tenantName = tenantRow?.company_name ?? '会社'

  // origin: 末尾スラッシュ無しの APP URL
  const origin = (process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/$/, '')

  let sent = 0
  const failed: SendFriendInvitesResult['failed'] = []

  for (const employeeId of employeeIds) {
    // 従業員の存在確認（自テナント・user_id あり）
    const { data: emp } = await supabase
      .from('employees')
      .select('id, name, user_id')
      .eq('id', employeeId)
      .eq('tenant_id', user.tenant_id)
      .not('user_id', 'is', null)
      .single()

    if (!emp || !emp.user_id) {
      failed.push({ employeeId, name: '', reason: '従業員が見つかりません' })
      continue
    }

    const empName = emp.name ?? ''

    // 招待トークンを生成して DB に INSERT
    const token = generateInviteToken()
    const expiresAt = inviteExpiryDate().toISOString()

    const { error: insertError } = await supabase.from('line_friend_invites').insert({
      tenant_id: user.tenant_id,
      employee_id: employeeId,
      invite_token: token,
      created_by: user.id,
      expires_at: expiresAt,
    })

    if (insertError) {
      failed.push({ employeeId, name: empName, reason: `DB エラー: ${insertError.message}` })
      continue
    }

    // メールアドレスを RPC で解決
    const { data: emailData } = await supabase.rpc('get_tenant_employee_auth_email', {
      p_tenant_id: user.tenant_id,
      p_user_id: emp.user_id,
    })

    const email = typeof emailData === 'string' && emailData.length > 0 ? emailData : ''

    if (!email) {
      failed.push({ employeeId, name: empName, reason: 'メールアドレスを取得できませんでした' })
      continue
    }

    // 招待メールを送信
    const inviteUrl = origin + APP_ROUTES.PUBLIC.LINE_FRIEND_INVITE(token)
    const { subject, html } = buildFriendInviteEmail({
      tenantName,
      adminName: user.name || '管理者',
      inviteUrl,
    })

    try {
      await sendMail({ to: email, subject, html })
      sent++
    } catch (mailError) {
      const reason = mailError instanceof Error ? mailError.message : String(mailError)
      failed.push({ employeeId, name: empName, reason: `メール送信エラー: ${reason}` })
    }
  }

  revalidatePath(APP_ROUTES.TENANT.ADMIN_LINE_FRIEND_INVITES)

  return { sent, failed }
}

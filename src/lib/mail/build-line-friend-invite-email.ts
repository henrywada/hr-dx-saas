import { escapeHtml } from '@/lib/mail/send'

/**
 * LINE友だち招待メールの件名・本文を組み立てる
 *
 * 本文先頭は「管理者（送信者名）より、…」形式。テナント名は件名のみに使う。
 */
export function buildFriendInviteEmail(params: {
  tenantName: string
  /** 招待を送った管理者の表示名 */
  adminName: string
  inviteUrl: string
}): {
  subject: string
  html: string
} {
  const adminName = escapeHtml(params.adminName)
  const inviteUrl = escapeHtml(params.inviteUrl)
  return {
    subject: `【${params.tenantName}】LINE友だち追加のお願い`,
    html: [
      `<p>管理者（${adminName}）より、LINE公式アカウントの友だち追加をお願いします。</p>`,
      `<p>下記のリンクを開き、表示されるQRコードをLINEアプリで読み取ってください。</p>`,
      `<p><a href="${inviteUrl}">${inviteUrl}</a></p>`,
      `<p>このリンクの有効期限は発行から72時間です。</p>`,
    ].join('\n'),
  }
}

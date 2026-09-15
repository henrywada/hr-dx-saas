import { escapeHtml } from '@/lib/mail/send'

export function buildFriendInviteEmail(params: { tenantName: string; inviteUrl: string }): {
  subject: string
  html: string
} {
  const tenantName = escapeHtml(params.tenantName)
  const inviteUrl = escapeHtml(params.inviteUrl)
  return {
    subject: `【${params.tenantName}】LINE友だち追加のお願い`,
    html: [
      `<p>${tenantName}の管理者より、LINE公式アカウントの友だち追加をお願いします。</p>`,
      `<p>下記のリンクを開き、表示されるQRコードをLINEアプリで読み取ってください。</p>`,
      `<p><a href="${inviteUrl}">${inviteUrl}</a></p>`,
      `<p>このリンクの有効期限は発行から72時間です。</p>`,
    ].join('\n'),
  }
}

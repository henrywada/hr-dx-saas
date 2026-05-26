import nodemailer from 'nodemailer'

/**
 * メール送信ユーティリティ
 *
 * ローカル開発: Inbucket SMTP (localhost:55325) 経由で Mailpit に送信
 * 本番環境: SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS 環境変数で設定
 */

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'localhost',
  port: Number(process.env.SMTP_PORT) || 55435,
  secure: Number(process.env.SMTP_PORT) === 465,
  // 本番でSMTP認証が必要な場合
  ...(process.env.SMTP_USER && process.env.SMTP_PASS
    ? {
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      }
    : {}),
})

/**
 * メール送信
 */
export async function sendMail({
  to,
  subject,
  html,
  text,
}: {
  to: string
  subject: string
  html?: string
  text?: string
}) {
  const from = process.env.MAIL_FROM || process.env.SMTP_FROM || 'noreply@hr-dx.jp'
  const content = html ?? (text ? text.replace(/\n/g, '<br>') : '')

  if (!content) {
    throw new Error('メール本文（html または text）を指定してください')
  }

  await transporter.sendMail({
    from,
    to,
    subject,
    html: content,
  })
}

/**
 * セルフサービス サインアップ: ウェルカムメール送信
 */
export async function sendWelcomeEmail(
  email: string,
  name: string,
  plan: 'free' | 'pro' | 'enterprise',
  resetLink: string
) {
  const planLabel = { free: '無料プラン', pro: 'プロプラン', enterprise: 'エンタープライズプラン' }[
    plan
  ]

  await sendMail({
    to: email,
    subject: '【HR-DX】ご登録ありがとうございます',
    html: `<p>${name} 様</p>
<p>HR-DX にご登録いただきありがとうございます。</p>
<p>お申し込みプラン：<strong>${planLabel}</strong></p>
<p>以下のリンクからパスワードを設定してログインしてください（72時間有効）。</p>
<p><a href="${resetLink}">${resetLink}</a></p>
<p>よろしくお願いいたします。<br>HR-DX サポートチーム</p>`,
  })
}

/**
 * セルフサービス サインアップ: enterprise 銀行振込指示メール送信
 */
export async function sendBankTransferEmail(
  email: string,
  name: string,
  instructions: {
    bankName: string
    branchName?: string
    accountType: string
    accountNumber: string
    accountHolderName: string
    dueDate: string
    amount: number
  },
  resetLink: string
) {
  const amountFormatted = instructions.amount.toLocaleString('ja-JP')

  await sendMail({
    to: email,
    subject: '【HR-DX】お振込のご案内（エンタープライズプラン）',
    html: `<p>${name} 様</p>
<p>HR-DX エンタープライズプランにお申し込みいただきありがとうございます。</p>
<p>以下の口座へお振込をお願いいたします。</p>
<table border="1" cellpadding="6" cellspacing="0">
  <tr><th>銀行名</th><td>${instructions.bankName}${instructions.branchName ? '　' + instructions.branchName : ''}</td></tr>
  <tr><th>口座種別</th><td>${instructions.accountType}</td></tr>
  <tr><th>口座番号</th><td>${instructions.accountNumber}</td></tr>
  <tr><th>口座名義</th><td>${instructions.accountHolderName}</td></tr>
  <tr><th>振込金額</th><td>¥${amountFormatted}</td></tr>
  <tr><th>振込期限</th><td>${instructions.dueDate}</td></tr>
</table>
<p>入金確認後、ご利用開始のご案内をお送りします。</p>
<p>なお、以下のリンクからパスワードを先に設定いただけます（72時間有効）。</p>
<p><a href="${resetLink}">${resetLink}</a></p>
<p>よろしくお願いいたします。<br>HR-DX サポートチーム</p>`,
  })
}

/**
 * 有効期限の日時を計算してフォーマットする
 * @param expirySeconds 有効期限（秒数）
 * @returns フォーマットされた日時文字列（例: 2026/02/28 17:30）
 */
export function formatExpiryDate(expirySeconds: number): string {
  const expirationDate = new Date(Date.now() + expirySeconds * 1000)
  const pad = (n: number) => String(n).padStart(2, '0')
  const y = expirationDate.getFullYear()
  const m = pad(expirationDate.getMonth() + 1)
  const d = pad(expirationDate.getDate())
  const h = pad(expirationDate.getHours())
  const min = pad(expirationDate.getMinutes())
  return `${y}/${m}/${d} ${h}:${min}`
}

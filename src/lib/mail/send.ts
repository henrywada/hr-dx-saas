import nodemailer from 'nodemailer'
import { PLAN_CONFIG, type PlanType } from '@/features/signup/types'

/**
 * メール送信ユーティリティ
 *
 * ローカル開発: Inbucket SMTP (localhost:55435, supabase/config.toml [inbucket].smtp_port) 経由で送信
 * 本番環境: SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS 環境変数で設定
 */

/**
 * メールHTMLへ埋め込むユーザー入力（氏名・会社名等）のエスケープ。
 * 未認証フォーム由来の値をそのまま埋め込むと HTML インジェクションが成立するため必須
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

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
  plan: PlanType,
  resetLink: string,
  planLabelOverride?: string
) {
  const planLabel = escapeHtml(planLabelOverride ?? PLAN_CONFIG[plan].label)
  const safeName = escapeHtml(name)

  await sendMail({
    to: email,
    subject: '【HR-DX】ご登録ありがとうございます',
    html: `<p>${safeName} 様</p>
<p>HR-DX にご登録いただきありがとうございます。</p>
<p>お申し込みプラン：<strong>${planLabel}</strong></p>
<p>以下のリンクからパスワードを設定してログインしてください（72時間有効）。</p>
<p><a href="${resetLink}">${resetLink}</a></p>
<p>よろしくお願いいたします。<br>HR-DX サポートチーム</p>`,
  })
}

/**
 * セルフサービス サインアップ: 銀行振込指示メール送信（銀行振込プラン用）
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
  const safeName = escapeHtml(name)

  await sendMail({
    to: email,
    subject: '【HR-DX】お振込のご案内',
    html: `<p>${safeName} 様</p>
<p>HR-DX にお申し込みいただきありがとうございます。</p>
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

// ─────────────────────────────────────────────────────────────────────────────
// 運営者（SaaS 管理者）向け通知
// ─────────────────────────────────────────────────────────────────────────────

/** 新規契約通知のデフォルト宛先（SIGNUP_ADMIN_NOTIFY_EMAIL で上書き可能） */
const DEFAULT_SIGNUP_ADMIN_EMAIL = 'wada007@gmail.com'

/** 支払方法コードの日本語ラベル */
const PAYMENT_METHOD_LABEL: Record<string, string> = {
  card: 'クレジットカード',
  bank_transfer: '銀行振込',
  free: '無料（決済なし）',
}

/** 日時を Asia/Tokyo で「YYYY/MM/DD HH:mm」形式に整形する */
function formatJst(value: Date | string): string {
  const date = typeof value === 'string' ? new Date(value) : value
  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}

/**
 * セルフサービス サインアップ: 運営者への新規契約通知メール送信
 *
 * サインアップ処理（テナント・契約・ユーザー作成）の完了後に呼び出す。
 * 送信失敗は登録処理を巻き戻さない（呼び出し側で握りつぶす）。
 */
export async function sendSignupAdminNotification(info: {
  tenantId: string
  companyName: string
  applicantName: string
  applicantEmail: string
  planLabel: string
  industry?: string | null
  paymentMethod: string
  paidAmount: number
  contractEndAt: string | null
}) {
  const to = process.env.SIGNUP_ADMIN_NOTIFY_EMAIL || DEFAULT_SIGNUP_ADMIN_EMAIL

  const rows: [string, string][] = [
    ['会社名', escapeHtml(info.companyName)],
    ['申込者名', escapeHtml(info.applicantName)],
    ['メールアドレス', escapeHtml(info.applicantEmail)],
    ['業種', escapeHtml(info.industry || '未入力')],
    ['プラン', escapeHtml(info.planLabel)],
    ['支払方法', PAYMENT_METHOD_LABEL[info.paymentMethod] ?? escapeHtml(info.paymentMethod)],
    ['決済金額', `¥${info.paidAmount.toLocaleString('ja-JP')}`],
    ['契約終了日', info.contractEndAt ? formatJst(info.contractEndAt) : '無期限'],
    ['テナントID', escapeHtml(info.tenantId)],
    ['申込日時', formatJst(new Date())],
  ]

  await sendMail({
    to,
    subject: `【HR-DX】新規契約: ${info.companyName}（${info.planLabel}）`,
    html: `<p>新規契約のサインアップが完了しました。</p>
<table border="1" cellpadding="6" cellspacing="0">
${rows.map(([label, value]) => `  <tr><th align="left">${label}</th><td>${value}</td></tr>`).join('\n')}
</table>`,
  })
}

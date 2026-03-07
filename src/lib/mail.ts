import nodemailer from 'nodemailer'

// SMTPのトランスポーター設定
const getTransporter = () => {
  // 環境変数 SMTP_USER がない（未設定の）か、デフォルトプレースホルダーの場合は、MailpitなどのローカルSMTPサーバーに送信する
  if (!process.env.SMTP_USER || process.env.SMTP_USER === 'your-smtp-username') {
    console.warn('⚠️ SMTP_USER is not configured. Routing emails to local Mailpit (smtp://127.0.0.1:55325).')
    return nodemailer.createTransport({
      host: '127.0.0.1',
      port: 55325, // Supabase local Mailpit SMTP port (shifted to 55325 based on web UI 55324)
      ignoreTLS: true,
    })
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 587,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
}

const transporter = getTransporter()

export const sendPulseEmail = async (to: string, candidateName: string, pulseUrl: string) => {
  const from = process.env.MAIL_FROM || '"HR-dx" <noreply@your-domain.com>'
  const subject = '【ご協力のお願い】本日の面接はいかがでしたでしょうか？ / 株式会社〇〇'

  const text = `${candidateName} 様

本日はお忙しい中、弊社の面接にお時間をいただき誠にありがとうございました。

今後の採用活動・面接体験の向上のため、率直なご感想をお伺いできればと存じます。
以下のURLより、簡単なアンケート（所要時間約30秒）にご協力いただけますでしょうか。

※本アンケート結果が選考結果に影響することは一切ございません。

▼アンケート回答URL
${pulseUrl}

何卒よろしくお願い申し上げます。

--------------------------------------------------
株式会社〇〇 採用担当
--------------------------------------------------
`

  // メール送信
  try {
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      text,
    })
    console.log('Message sent: %s', info.messageId)
  } catch (error) {
    console.error('Error sending email:', error)
    throw new Error('メール送信に失敗しました')
  }
}

export const sendRiskAlertEmail = async (
  to: string,
  candidateName: string,
  score: number,
  concerns: string[],
  comment: string
) => {
  const from = process.env.MAIL_FROM || '"HR-dx" <noreply@your-domain.com>'
  const subject = `⚠️ 【要対応】${candidateName}様の辞退リスクが高まっています（Candidate Pulse）`
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const dashboardUrl = `${baseUrl}/adm/pulse`

  const text = `${candidateName} 様から以下のアンケート回答がありました。
至急フォロー面談等の対応をご検討ください。

■ 回答内容
・感情スコア: ${score} / 5
・懸念点: ${concerns.length > 0 ? concerns.join('、') : 'なし'}
・コメント: ${comment || 'なし'}

▼ ダッシュボードで詳細を確認する
${dashboardUrl}

--------------------------------------------------
HR-dx Candidate Pulse 自動通知
--------------------------------------------------
`

  try {
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      text,
    })
    console.log('Alert message sent: %s', info.messageId)
  } catch (error) {
    console.error('Error sending alert email:', error)
    // Here we don't throw an error to prevent breaking the submission flow for the candidate,
    // but we log it properly instead.
  }
}

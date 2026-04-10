import nodemailer from 'nodemailer';

/**
 * メール送信ユーティリティ
 * 
 * ローカル開発: Inbucket SMTP (localhost:55325) 経由で Mailpit に送信
 * 本番環境: SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS 環境変数で設定
 */

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'localhost',
  port: Number(process.env.SMTP_PORT) || 55325,
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
});

/**
 * メール送信
 */
export async function sendMail({
  to,
  subject,
  html,
  text,
}: {
  to: string;
  subject: string;
  html?: string;
  text?: string;
}) {
  const from = process.env.MAIL_FROM || process.env.SMTP_FROM || 'noreply@hr-dx.jp';
  const content = html ?? (text ? text.replace(/\n/g, '<br>') : '');

  if (!content) {
    throw new Error('メール本文（html または text）を指定してください');
  }

  await transporter.sendMail({
    from,
    to,
    subject,
    html: content,
  });
}

/**
 * 有効期限の日時を計算してフォーマットする
 * @param expirySeconds 有効期限（秒数）
 * @returns フォーマットされた日時文字列（例: 2026/02/28 17:30）
 */
export function formatExpiryDate(expirySeconds: number): string {
  const expirationDate = new Date(Date.now() + expirySeconds * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  const y = expirationDate.getFullYear();
  const m = pad(expirationDate.getMonth() + 1);
  const d = pad(expirationDate.getDate());
  const h = pad(expirationDate.getHours());
  const min = pad(expirationDate.getMinutes());
  return `${y}/${m}/${d} ${h}:${min}`;
}

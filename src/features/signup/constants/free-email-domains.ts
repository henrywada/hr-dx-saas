/**
 * フリーメール（個人向けメールサービス）ドメインの拒否リスト。
 * サインアップは会社メールアドレスのみ許可するため、これらのドメインを拒否する。
 * クライアント（フォーム検証）・サーバー（Server Action）の両方から参照される。
 */
export const FREE_EMAIL_DOMAINS: ReadonlySet<string> = new Set([
  // Google
  'gmail.com',
  'googlemail.com',
  // Yahoo
  'yahoo.co.jp',
  'yahoo.com',
  'ymail.ne.jp',
  // Microsoft
  'outlook.com',
  'outlook.jp',
  'hotmail.com',
  'hotmail.co.jp',
  'hotmail.jp',
  'live.jp',
  'live.com',
  'msn.com',
  // Apple
  'icloud.com',
  'me.com',
  'mac.com',
  // その他海外系
  'aol.com',
  'protonmail.com',
  'proton.me',
  'gmx.com',
  'gmx.net',
  'mail.com',
  'zoho.com',
  'yandex.com',
  // 国内キャリア
  'docomo.ne.jp',
  'ezweb.ne.jp',
  'au.com',
  'softbank.ne.jp',
  'i.softbank.jp',
  'ymobile.ne.jp',
])

/** メールアドレスのドメインがフリーメールかどうかを判定する */
export function isFreeEmailDomain(email: string): boolean {
  const atIndex = email.lastIndexOf('@')
  if (atIndex < 0) return false
  const domain = email.slice(atIndex + 1).toLowerCase()
  return FREE_EMAIL_DOMAINS.has(domain)
}

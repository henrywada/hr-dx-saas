import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * 配信停止トークン（HMAC-SHA256）。
 *
 * 助成金情報配信メールのフッタに置く配信停止リンク用。メールごとに
 * tenant_id + メールアドレスを署名し、未ログインのまま安全に配信停止できるようにする。
 * 純粋関数のみで構成し、DB には依存しない。
 */

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url')
}

/** 配信停止リンク用トークンを発行する */
export function createUnsubscribeToken(tenantId: string, email: string, secret: string): string {
  const payload = `${tenantId}:${email}`
  const sig = sign(payload, secret)
  return `${Buffer.from(payload).toString('base64url')}.${sig}`
}

/** 配信停止トークンを検証する。改ざん・不正な形式は null を返す */
export function verifyUnsubscribeToken(
  token: string,
  secret: string
): { tenantId: string; email: string } | null {
  const parts = token.split('.')
  if (parts.length !== 2) return null

  const [encoded, sig] = parts
  if (!encoded || !sig) return null

  let payload: string
  try {
    payload = Buffer.from(encoded, 'base64url').toString('utf8')
  } catch {
    return null
  }

  // タイミング攻撃を避けるため timingSafeEqual で比較する（長さ不一致は先に弾く）
  const sigBuf = Buffer.from(sig)
  const expectedBuf = Buffer.from(sign(payload, secret))
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
    return null
  }

  const sep = payload.indexOf(':')
  if (sep === -1) return null

  return { tenantId: payload.slice(0, sep), email: payload.slice(sep + 1) }
}

/**
 * QR トークン用 HMAC-SHA256（署名・検証）
 * メッセージ形式: sessionId|expUnixSec|tenantId|nonce|purpose
 */

const encoder = new TextEncoder()

export function bytesToBase64Url(bytes: Uint8Array): string {
  let bin = ""
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!)
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

export function base64UrlToBytes(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4))
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + pad
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

export async function hmacSha256(secret: string, message: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(message))
  return new Uint8Array(sig)
}

export function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  let x = 0
  for (let i = 0; i < a.length; i++) x |= a[i]! ^ b[i]!
  return x === 0
}

export type QrTokenPayload = {
  sessionId: string
  exp: number
  tenantId: string
  nonce: string
  purpose: string
}

export function encodeTokenMessage(p: QrTokenPayload): string {
  return `${p.sessionId}|${p.exp}|${p.tenantId}|${p.nonce}|${p.purpose}`
}

export function decodeTokenMessage(msg: string): QrTokenPayload | null {
  const parts = msg.split("|")
  if (parts.length !== 5) return null
  const [sessionId, expStr, tenantId, nonce, purpose] = parts
  const exp = Number(expStr)
  if (!sessionId || !Number.isFinite(exp) || !tenantId || !nonce || !purpose) return null
  return { sessionId, exp, tenantId, nonce, purpose }
}

export async function signQrToken(secret: string, payload: QrTokenPayload): Promise<string> {
  const message = encodeTokenMessage(payload)
  const sig = await hmacSha256(secret, message)
  const msgB64 = bytesToBase64Url(encoder.encode(message))
  const sigB64 = bytesToBase64Url(sig)
  return `${msgB64}.${sigB64}`
}

export async function verifyQrToken(
  secret: string,
  token: string,
): Promise<{ ok: true; payload: QrTokenPayload } | { ok: false; reason: string }> {
  const dot = token.indexOf(".")
  if (dot < 0) return { ok: false, reason: "malformed_token" }
  const msgB64 = token.slice(0, dot)
  const sigB64 = token.slice(dot + 1)
  let message: string
  try {
    message = new TextDecoder().decode(base64UrlToBytes(msgB64))
  } catch {
    return { ok: false, reason: "invalid_encoding" }
  }
  const payload = decodeTokenMessage(message)
  if (!payload) return { ok: false, reason: "invalid_payload" }

  const expected = await hmacSha256(secret, message)
  let sig: Uint8Array
  try {
    sig = base64UrlToBytes(sigB64)
  } catch {
    return { ok: false, reason: "invalid_signature_encoding" }
  }
  if (!timingSafeEqual(expected, sig)) return { ok: false, reason: "bad_signature" }

  const nowSec = Math.floor(Date.now() / 1000)
  if (payload.exp < nowSec) return { ok: false, reason: "expired" }

  return { ok: true, payload }
}

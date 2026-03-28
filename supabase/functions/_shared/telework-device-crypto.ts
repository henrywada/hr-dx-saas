/**
 * telework device_secret の AES-256-GCM 暗号化（DB 上は平文保存しない）
 * 鍵: TELEWORK_DEVICE_ENCRYPTION_KEY（32 バイトの base64url または標準 base64）
 * 未設定時はローカル開発のみ固定フォールバック（QR と同様、本番では必ず secrets を設定すること）
 */
import { isLikelyLocalSupabaseUrl } from "./qr-secret.ts"

const PREFIX = "tw1."

/** ローカル専用 32 バイト（UTF-8）。本番では必ず TELEWORK_DEVICE_ENCRYPTION_KEY を設定 */
const DEV_LOCAL_KEY_UTF8 = "local-dev-telework-key-32bytes!!"

function decodeKey(): Uint8Array {
  const b64 = Deno.env.get("TELEWORK_DEVICE_ENCRYPTION_KEY")?.trim() ?? ""
  if (b64) {
    const raw = Uint8Array.from(atob(b64.replace(/-/g, "+").replace(/_/g, "/")), (c) =>
      c.charCodeAt(0))
    if (raw.length !== 32) {
      throw new Error("TELEWORK_DEVICE_ENCRYPTION_KEY must decode to 32 bytes")
    }
    return raw
  }

  const url = Deno.env.get("SUPABASE_URL") ?? ""
  if (isLikelyLocalSupabaseUrl(url)) {
    const k = new TextEncoder().encode(DEV_LOCAL_KEY_UTF8)
    if (k.length !== 32) {
      throw new Error("dev telework key must be 32 bytes")
    }
    return k
  }

  throw new Error("TELEWORK_DEVICE_ENCRYPTION_KEY is not set")
}

function toB64(u8: Uint8Array): string {
  let s = ""
  for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]!)
  return btoa(s)
}

function fromB64(s: string): Uint8Array {
  const bin = atob(s)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

export async function encryptDeviceSecretPlain(plainUtf8: string): Promise<string> {
  const keyMaterial = decodeKey()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await crypto.subtle.importKey(
    "raw",
    keyMaterial,
    { name: "AES-GCM" },
    false,
    ["encrypt"],
  )
  const enc = new TextEncoder()
  const cipherBuf = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    enc.encode(plainUtf8),
  )
  const cipher = new Uint8Array(cipherBuf)
  return `${PREFIX}${toB64(iv)}.${toB64(cipher)}`
}

export function isEncryptedDeviceSecret(value: string | null | undefined): boolean {
  return typeof value === "string" && value.startsWith(PREFIX)
}

export async function decryptDeviceSecretStored(stored: string): Promise<string> {
  if (!stored.startsWith(PREFIX)) {
    throw new Error("unexpected_device_secret_format")
  }
  const rest = stored.slice(PREFIX.length)
  const [ivB64, ctB64] = rest.split(".")
  if (!ivB64 || !ctB64) throw new Error("invalid_device_secret_blob")
  const iv = fromB64(ivB64)
  const cipher = fromB64(ctB64)
  const keyMaterial = decodeKey()
  const key = await crypto.subtle.importKey(
    "raw",
    keyMaterial,
    { name: "AES-GCM" },
    false,
    ["decrypt"],
  )
  const plainBuf = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    cipher,
  )
  return new TextDecoder().decode(plainBuf)
}

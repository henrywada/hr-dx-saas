/**
 * 端末 HMAC 署名: canonical JSON + SHA-256 HMAC（device_secret は平文 hex 64 文字想定）
 */
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.7"
import { decryptDeviceSecretStored, isEncryptedDeviceSecret } from "./telework-device-crypto.ts"

/** キー昇順に再帰的にソートしたオブジェクトを JSON 化（署名メッセージ用） */
export function canonicalStringify(value: unknown): string {
  const norm = sortValue(value)
  return JSON.stringify(norm)
}

function sortValue(value: unknown): unknown {
  if (value === null || typeof value !== "object") return value
  if (Array.isArray(value)) return value.map(sortValue)
  const o = value as Record<string, unknown>
  const out: Record<string, unknown> = {}
  for (const k of Object.keys(o).sort()) {
    out[k] = sortValue(o[k])
  }
  return out
}

function hexToBytes(hex: string): Uint8Array {
  const s = hex.length % 2 === 0 ? hex : `0${hex}`
  const out = new Uint8Array(s.length / 2)
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(s.slice(i * 2, i * 2 + 2), 16)
  }
  return out
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let x = 0
  for (let i = 0; i < a.length; i++) {
    x |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return x === 0
}

export async function computeHmacSha256Hex(
  secretHex: string,
  message: string,
): Promise<string> {
  const keyBytes = hexToBytes(secretHex)
  const key = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(message),
  )
  const bytes = new Uint8Array(sig)
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("")
}

const SKEW_MS = 5 * 60 * 1000

function parseTimestampMs(ts: string | number | undefined): number | null {
  if (ts === undefined) return null
  if (typeof ts === "number" && Number.isFinite(ts)) return ts
  if (typeof ts === "string") {
    const n = Date.parse(ts)
    if (!Number.isNaN(n)) return n
    const asNum = Number(ts)
    if (Number.isFinite(asNum)) return asNum
  }
  return null
}

export type DeviceRow = {
  id: string
  tenant_id: string
  user_id: string
  approved: boolean | null
  device_secret: string | null
}

export async function verifyDeviceSignature(
  admin: SupabaseClient,
  opts: {
    deviceId: string
    timestamp: string | number | undefined
    payload: unknown
    signature: string
    tenantId: string
    userId: string
    actorUserId?: string | null
  },
): Promise<{ ok: true; device: DeviceRow } | { ok: false; error: string }> {
  const { deviceId, timestamp, payload, signature, tenantId, userId } = opts
  const sig = typeof signature === "string" ? signature.trim().toLowerCase() : ""
  if (!sig || !/^[0-9a-f]{64}$/.test(sig)) {
    await logSignatureFailure(admin, tenantId, opts.actorUserId ?? null, deviceId, "bad_signature_format")
    return { ok: false, error: "invalid_signature" }
  }

  const tsMs = parseTimestampMs(timestamp)
  if (tsMs === null) {
    await logSignatureFailure(admin, tenantId, opts.actorUserId ?? null, deviceId, "bad_timestamp")
    return { ok: false, error: "invalid_timestamp" }
  }
  const now = Date.now()
  if (Math.abs(now - tsMs) > SKEW_MS) {
    await logSignatureFailure(admin, tenantId, opts.actorUserId ?? null, deviceId, "timestamp_skew")
    return { ok: false, error: "timestamp_out_of_range" }
  }

  const { data: device, error } = await admin
    .from("telework_pc_devices")
    .select("id, tenant_id, user_id, approved, device_secret")
    .eq("id", deviceId)
    .maybeSingle()

  if (error || !device) {
    await logSignatureFailure(admin, tenantId, opts.actorUserId ?? null, deviceId, "device_not_found")
    return { ok: false, error: "device_not_found" }
  }

  const d = device as DeviceRow
  if (d.tenant_id !== tenantId) {
    await logSignatureFailure(admin, tenantId, opts.actorUserId ?? null, deviceId, "tenant_mismatch")
    return { ok: false, error: "tenant_mismatch" }
  }
  if (d.user_id !== userId) {
    await logSignatureFailure(admin, tenantId, opts.actorUserId ?? null, deviceId, "user_mismatch")
    return { ok: false, error: "device_user_mismatch" }
  }
  if (!d.approved) {
    await logSignatureFailure(admin, tenantId, opts.actorUserId ?? null, deviceId, "not_approved")
    return { ok: false, error: "device_not_approved" }
  }
  if (!d.device_secret || !isEncryptedDeviceSecret(d.device_secret)) {
    await logSignatureFailure(admin, tenantId, opts.actorUserId ?? null, deviceId, "no_secret")
    return { ok: false, error: "device_secret_missing" }
  }

  let secretPlain: string
  try {
    secretPlain = await decryptDeviceSecretStored(d.device_secret)
  } catch {
    await logSignatureFailure(admin, tenantId, opts.actorUserId ?? null, deviceId, "decrypt_failed")
    return { ok: false, error: "device_secret_decrypt_failed" }
  }

  const tsNormalized =
    typeof timestamp === "number"
      ? timestamp
      : typeof timestamp === "string" && /^\d+$/.test(timestamp.trim())
      ? Number(timestamp.trim())
      : timestamp

  const message = canonicalStringify({
    device_id: deviceId,
    timestamp: tsNormalized,
    payload,
  })

  const expected = await computeHmacSha256Hex(secretPlain, message)
  if (!timingSafeEqualHex(expected, sig)) {
    await logSignatureFailure(admin, tenantId, opts.actorUserId ?? null, deviceId, "hmac_mismatch")
    return { ok: false, error: "signature_mismatch" }
  }

  return { ok: true, device: d }
}

async function logSignatureFailure(
  admin: SupabaseClient,
  tenantId: string,
  actorUserId: string | null,
  deviceId: string,
  reason: string,
) {
  try {
    await admin.from("telework_audit_logs").insert({
      tenant_id: tenantId,
      actor_user_id: actorUserId,
      action: "device_signature_failed",
      related_table: "telework_pc_devices",
      related_id: deviceId,
      payload: { reason },
    })
  } catch (e) {
    console.error("audit log insert failed", e)
  }
}

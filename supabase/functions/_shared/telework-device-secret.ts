/**
 * 承認時: device_secret（64 hex）を生成し AES-GCM で保存する
 */
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.7"
import { encryptDeviceSecretPlain } from "./telework-device-crypto.ts"

function randomHex32(): string {
  const b = crypto.getRandomValues(new Uint8Array(32))
  return [...b].map((x) => x.toString(16).padStart(2, "0")).join("")
}

export type IssueSecretResult =
  | { ok: true; deviceSecretPlain: string }
  | { ok: false; error: string }

/**
 * 平文 secret を生成し DB に暗号化保存。approved / secret_issued_at を更新する。
 */
export async function issueEncryptedDeviceSecret(
  admin: SupabaseClient,
  opts: {
    deviceId: string
    tenantId: string
    approvedByUserId: string
  },
): Promise<IssueSecretResult> {
  const plain = randomHex32()
  let stored: string
  try {
    stored = await encryptDeviceSecretPlain(plain)
  } catch (e) {
    console.error("encryptDeviceSecretPlain", e)
    return { ok: false, error: "encrypt_failed" }
  }

  const now = new Date().toISOString()
  const { data: updated, error } = await admin
    .from("telework_pc_devices")
    .update({
      device_secret: stored,
      approved: true,
      approved_by: opts.approvedByUserId,
      approved_at: now,
      secret_issued_at: now,
      secret_delivered_at: null,
      rejected_at: null,
      rejection_reason: null,
    })
    .eq("id", opts.deviceId)
    .eq("tenant_id", opts.tenantId)
    .select("id")
    .maybeSingle()

  if (error) {
    console.error("issueEncryptedDeviceSecret update", error)
    return { ok: false, error: "update_failed" }
  }
  if (!updated?.id) {
    return { ok: false, error: "device_not_found_or_tenant_mismatch" }
  }

  return { ok: true, deviceSecretPlain: plain }
}
